import { useEffect, useRef, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { AppState, Linking, Platform } from 'react-native';
import {
  endConnection, fetchProducts, finishTransaction, getAvailablePurchases, initConnection,
  purchaseErrorListener, purchaseUpdatedListener, requestPurchase,
  ErrorCode, type ProductSubscriptionAndroid, type Purchase,
} from 'react-native-iap';

const product = 'healthy_care_pro_monthly';
const plan = 'monthly';
const cache = 'healthy.play.lastVerified';
const offlineWindow = 48 * 60 * 60 * 1000;

export function useMembership() {
  const [verifiedAt, setVerifiedAt] = useState(0);
  const [now, setNow] = useState(Date.now);
  const [price, setPrice] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const offer = useRef('');
  const connecting = useRef<Promise<boolean> | null>(null);
  const buying = useRef(false);
  const active = verifiedAt > 0 && now >= verifiedAt && now - verifiedAt < offlineWindow;

  function connect() {
    if (Platform.OS !== 'android') return Promise.resolve(false);
    if (!connecting.current) {
      const pending = initConnection().catch(() => false);
      connecting.current = pending;
      void pending.then(ok => { if (!ok && connecting.current === pending) connecting.current = null; });
    }
    return connecting.current;
  }
  async function reconcile() {
    setNow(Date.now());
    if (!await connect()) throw new Error('STORE_UNAVAILABLE');
    let purchases: Purchase[];
    try { purchases = await getAvailablePurchases(); }
    catch (error) { connecting.current = null; throw error; }
    const purchase = purchases.find(item =>
      item.platform === 'android' && item.productId === product && item.purchaseState === 'purchased' && item.purchaseToken);
    if (!purchase) {
      setVerifiedAt(0);
      await SecureStore.deleteItemAsync(cache).catch(() => {});
      return false;
    }
    if ('isAcknowledgedAndroid' in purchase && !purchase.isAcknowledgedAndroid) {
      await finishTransaction({ purchase, isConsumable:false });
    }
    const checked = Date.now();
    setNow(checked);
    setVerifiedAt(checked);
    await SecureStore.setItemAsync(cache, String(checked)).catch(() => {});
    return true;
  }
  async function loadOffer() {
    if (!await connect()) return;
    const items = await fetchProducts({ skus:[product], type:'subs' });
    const entry = items?.find(item => item.id === product && item.platform === 'android') as ProductSubscriptionAndroid | undefined;
    const base = entry?.subscriptionOfferDetailsAndroid.find(item => item.basePlanId === plan && !item.offerId);
    const phase = base?.pricingPhases.pricingPhaseList.find(item => item.billingPeriod === 'P1M' && item.recurrenceMode === 1);
    if (!base || !phase) {
      offer.current = '';
      setPrice('');
      return;
    }
    offer.current = base.offerToken;
    setPrice(phase.formattedPrice);
  }
  async function restore() {
    if (buying.current) return;
    buying.current = true;
    setBusy(true);
    setNotice('');
    try { setNotice(await reconcile() ? 'تمّت استعادة اشتراكك.' : 'ما في اشتراك فعّال على حساب Google Play الحالي.'); }
    catch { setNotice('تعذّر الاتصال بـGoogle Play. اتصل بالإنترنت وحاول مرة ثانية.'); }
    finally { buying.current = false; setBusy(false); }
  }
  async function buy() {
    if (!offer.current || buying.current) return;
    buying.current = true;
    setBusy(true);
    setNotice('');
    try {
      await requestPurchase({ type:'subs', request:{android:{skus:[product], subscriptionOffers:[{sku: product, offerToken:offer.current}]}} });
    } catch { setNotice('تعذّر فتح Google Play. حاول مرة ثانية.'); }
    finally { buying.current = false; setBusy(false); }
  }
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    let live = true;
    void SecureStore.getItemAsync(cache).then(value => {
      if (live && value && /^\d+$/.test(value)) setVerifiedAt(Number(value));
    }).catch(() => {}).finally(() => { if (live) void reconcile().catch(() => {}); });
    const updated = purchaseUpdatedListener(item => {
      if (item.productId !== product) return;
      if (item.purchaseState === 'pending') { setNotice('Google Play بانتظار اكتمال الدفع.'); return; }
      void reconcile().then(owned => { if (owned) setNotice('اشتراكك صار فعّالًا.'); })
        .catch(() => setNotice('تعذّر تأكيد الاشتراك. جرّب استعادة الاشتراك.'));
    });
    const failed = purchaseErrorListener(error => {
      if (error.productId && error.productId !== product) return;
      if (error.code !== ErrorCode.UserCancelled) setNotice('عملية الاشتراك ما اكتملت. حاول مرة ثانية.');
    });
    const resume = AppState.addEventListener('change', state => {
      if (state === 'active') {
        void reconcile().catch(() => {});
        void loadOffer().catch(() => {});
      }
    });
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    void loadOffer().catch(() => {});
    return () => { live = false; updated.remove(); failed.remove(); resume.remove(); clearInterval(timer); void endConnection().catch(() => {}); };
  }, []);
  function manage() {
    void Linking.openURL('https://play.google.com/store/account/subscriptions?sku=healthy_care_pro_monthly&package=com.healthy.securehealth')
      .catch(() => setNotice('افتح الاشتراكات من تطبيق Google Play.'));
  }
  return { active, price, notice, busy, buy, restore, manage };
}
