export function useMembership() {
  const unavailable = async () => {};
  return { active: false, price: '', notice: 'الاشتراك متاح عن طريق Google Play على أندرويد.', busy: false,
    buy: unavailable, restore: unavailable, manage: () => {} };
}
