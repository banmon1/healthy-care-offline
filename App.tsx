import React, { useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BackHandler, FlatList, I18nManager, Image, Modal, Pressable, ScrollView, StyleSheet, Text as NativeText, TextInput, View, ActivityIndicator, Linking, useColorScheme, type TextProps } from 'react-native';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Activity, ArrowLeft, CalendarDays, Check, ChevronLeft, Crown, Droplets, Dumbbell, Footprints, Search, Settings, SlidersHorizontal, UserRound, Utensils, X } from 'lucide-react-native';
import { dayKey, useActivity } from './src/activity';
import { allOpenGymExercises, exercises, legacyExercises, exerciseAliases, normalizeSearch, categories, gear, levels, meals, muscles, regions, routines, titleFor, type Exercise, type Routine } from './src/training';
import { OpenGymBody, bodyMuscles, exerciseBody, type BodyMuscle } from './src/OpenGymBody';
import { exerciseIllustrations } from './src/exercise-illustrations';
import { ExerciseMotion } from './src/ExerciseMotion';
import { bodyThumbnails } from './src/body-thumbnails';
import { useMembership } from './src/membership';

type ThemeMode = 'system' | 'light' | 'dark';
const lightColors = {ink:'#222730', muted:'#596470', paper:'#FAFBFC', accent:'#CF561C', deep:'#262C35', card:'#FFFFFF', border:'#DFE5EB', soft:'#F0F3F6', warm:'#FFF0E5', warmBorder:'#F2C8AD', warmText:'#9F3B11', warmMuted:'#744E3A', track:'#F0D7C7', water:'#EAF2F8', waterFill:'#4B91BC', button:'#AB4211'};
const darkColors: typeof lightColors = {ink:'#F1F2F5', muted:'#B6BEC8', paper:'#11151B', accent:'#FF985E', deep:'#F0F3F7', card:'#1C222A', border:'#343D49', soft:'#28313B', warm:'#38291F', warmBorder:'#65503E', warmText:'#FFAC7F', warmMuted:'#E8C8B5', track:'#584134', water:'#273541', waterFill:'#68B4E0', button:'#A94313'};
const themeKey = 'healthy.theme.v1';
const memberKey = 'healthy.activity.v2';
type Tab = 'today' | 'library' | 'body' | 'plans';
type Page = { type: 'exercise'; id: string } | { type: 'routine'; id: string } |
  { type: 'nutrition' } | { type: 'plus' } | {type:'settings'};
type Progress = {
  water: Record<string, number>;
  saved: string[];
  routine: string | null;
  completed: Record<string, string>;
};
const empty: Progress = { water: {}, saved: [], routine: null, completed: {} };
const tabs = [
  { key:'today', label:'اليوم', Icon:Activity }, { key:'library', label:'التمارين', Icon:Dumbbell },
  { key:'body', label:'العضلات', Icon:UserRound }, { key:'plans', label:'الجداول', Icon:CalendarDays }
] as const;
const byId = new Map([...allOpenGymExercises, ...legacyExercises].map(exercise => [exercise.id, exercise]));
const exerciseKind = (item: Exercise) => categories[item.category] ?? levels[item.level] ?? 'تمرين';
const searchNames = new Map(allOpenGymExercises.map(item => [
  item.id, [item.name, item.englishName ?? ''].map(normalizeSearch),
]));
const exerciseIndex = new Map(allOpenGymExercises.map(item => [item.id, normalizeSearch([
  item.name, item.englishName, ...item.primaryMuscles.map(m => muscles[m] ?? m),
].filter(Boolean).join(' '))]));

function Intro({ eyebrow, title, caption }: {eyebrow?: string; title: string; caption: string}) {
  const {s}=React.useContext(Theme);
  return <View style={s.intro}>{eyebrow && <Text style={s.eyebrow}>{eyebrow}</Text>}<Text accessibilityRole="header" style={s.title}>{title}</Text><Text style={s.copy}>{caption}</Text></View>;
}
function Text({style,...props}:TextProps) {
  const weight=StyleSheet.flatten(style)?.fontWeight;
  const bold=weight==='bold' || Number(weight)>=600;
  return <NativeText {...props} style={[{fontFamily:bold ? 'CairoBold' : 'Cairo'},style,{fontWeight:'normal'}]}/>;
}
function Action({ children, onPress, quiet = false, disabled = false }: {children: string; onPress: () => void; quiet?: boolean; disabled?: boolean}) {
  const {s, colors}=React.useContext(Theme);
  return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={[s.action, quiet && s.actionQuiet, disabled && s.disabled]}>
    <Text style={[s.actionText,quiet && {color:colors.warmText}]}>{children}</Text>
  </Pressable>;
}
function Chip({ children, onPress, active }: {children: string; onPress: () => void; active?: boolean}) {
  const {s}=React.useContext(Theme);
  return <Pressable accessibilityRole="button" accessibilityState={{ selected: !!active }} onPress={onPress} style={[s.chip, active && s.chipOn]}>
    <Text style={[s.chipText, active && s.chipTextOn]}>{children}</Text>
  </Pressable>;
}
function ExerciseRow({ exercise, onPress }: {exercise: Exercise; onPress: () => void}) {
  const {s,colors}=React.useContext(Theme);
  const diagram=exerciseBody(exercise.primaryMuscles);
  const illustration=exerciseIllustrations[exercise.id];
  return <Pressable accessibilityRole="button" accessibilityLabel={titleFor(exercise)} onPress={onPress} style={s.exercise}>
    <View style={s.thumb}><Image source={illustration?.frames[0] ?? bodyThumbnails[diagram.selected ?? 'default'] ?? bodyThumbnails.default}
      style={illustration ? s.thumbImage : {height:76,width:48}} resizeMode="contain" resizeMethod="resize"/></View>
    <View style={s.grow}><Text numberOfLines={2} style={s.h3}>{titleFor(exercise)}</Text>
      <Text style={s.small}>{exercise.primaryMuscles.map(m => muscles[m] ?? m).join('، ')} · {exerciseKind(exercise)}</Text></View>
    <ChevronLeft color={colors.deep} size={18}/>
  </Pressable>;
}

function Healthy({mode,onThemeChange,isDark}: {mode:ThemeMode; onThemeChange:(mode:ThemeMode)=>void; isDark:boolean}) {
  const {s,colors:{accent,deep,muted}} = React.useContext(Theme);
  const steps = useActivity();
  const member = useMembership();
  const [tab, setTab] = useState<Tab>('today');
  const [pages, setPages] = useState<Page[]>([]);
  const page = pages.at(-1);
  const [progress, setProgress] = useState<Progress>(empty);
  const [loaded, setLoaded] = useState(false);
  const writes = useRef(Promise.resolve());
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<string[]>([]);
  const [equipment, setEquipment] = useState<string | null>(null);
  const [onlySaved, setOnlySaved] = useState(false);
  const [illustratedOnly,setIllustratedOnly] = useState(false);
  const [filtersOpen,setFiltersOpen] = useState(false);
  const [category, setCategory] = useState<string | null>(null);
  const [side, setSide] = useState<'front' | 'back'>('front');
  const muscleChips = useRef<ScrollView>(null);
  const [muscle, setMuscle] = useState<BodyMuscle>('chest');
  const day = dayKey();
  const activeRoutine = routines.find(item => item.id === progress.routine);
  const water = progress.water[day] ?? 0;
  const [regionName, regionDescription, regionMuscles] = regions[muscle];
  const filterCount=filter.length+Number(Boolean(equipment))+Number(Boolean(category))+Number(illustratedOnly);
  const filtered = useMemo(() => {
    const phrase = normalizeSearch(search).trim();
    const query = phrase.split(' ').filter(Boolean);
    const pool = onlySaved ? progress.saved.flatMap(id => byId.has(id) ? [byId.get(id)!] : []) : query.length ? allOpenGymExercises : exercises;
    const matches = pool.filter(item => {
      const matchMuscle = filter.some(m => item.primaryMuscles.includes(m));
      const haystack = exerciseIndex.get(item.id) ?? normalizeSearch(titleFor(item));
      return (!filter.length || matchMuscle) && (!equipment || item.equipment === equipment)
        && (!category || item.category === category) && (!illustratedOnly || Boolean(exerciseIllustrations[item.id])) && query.every(word => haystack.includes(word));
    });
    if (!phrase) return matches;
    const rank = (item: Exercise) => {
      const names = searchNames.get(item.id) ?? [normalizeSearch(titleFor(item))];
      if (names.some(name => name === phrase)) return 0;
      if (names.some(name => name.startsWith(phrase))) return 1;
      return names.some(name => name.includes(phrase)) ? 2 : 3;
    };
    return matches.map(item => ({item, score:rank(item)})).sort((a,b) => a.score - b.score).map(result => result.item);
  }, [filter, equipment, category, search, onlySaved, illustratedOnly, progress.saved]);

  useEffect(() => {
    let alive = true;
    void AsyncStorage.getItem(memberKey).then(raw => {
      if (!alive || !raw) return;
      const value = JSON.parse(raw);
      if (!value || typeof value !== 'object') return;
      setProgress({
        water: Object.fromEntries(Object.entries(value.water ?? {}).filter((entry): entry is [string, number] => {
          const [date,count] = entry;
          return /^\d{4}-\d{2}-\d{2}$/.test(date) && typeof count === 'number' && Number.isSafeInteger(count) && count >= 0 && count <= 30;
        })),
        saved: Array.isArray(value.saved) ? [...new Set<string>(value.saved.filter((id: unknown): id is string => typeof id === 'string').map((id: string) => exerciseAliases[id] ?? id).filter((id: string) => byId.has(id)))] : [],
        routine: routines.some(plan => plan.id === value.routine) ? value.routine : null,
        completed: Object.fromEntries(Object.entries(value.completed ?? {}).filter((entry): entry is [string, string] => {
          const [id,date] = entry;
          return routines.some(plan => plan.days.some((_,index) => id === `${plan.id}.${index}`))
            && typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date);
        })),
      });
    }).catch(() => {}).finally(() => { if (alive) setLoaded(true); });
    return () => { alive = false; };
  }, []);
  useEffect(() => {
    if (!loaded) return;
    const snapshot = JSON.stringify(progress);
    writes.current = writes.current.then(() => AsyncStorage.setItem(memberKey, snapshot)).catch(() => {});
  }, [progress, loaded]);
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (pages.length) { setPages(p => p.slice(0, -1)); return true; }
      if (tab !== 'today') { setTab('today'); return true; }
      return false;
    });
    return () => sub.remove();
  }, [pages.length, tab]);
  function open(next: Page) { setPages(current => [...current, next]); }
  function go(next: Tab) { setPages([]); setTab(next); }
  function adjustWater(amount: number) {
    setProgress(previous => ({ ...previous, water: { ...previous.water, [day]: Math.max(0, Math.min(30, (previous.water[day] ?? 0) + amount)) } }));
  }
  function save(id: string) {
    setProgress(previous => ({ ...previous, saved: previous.saved.includes(id) ? previous.saved.filter(value => value !== id) : [...previous.saved, id] }));
  }
  const row = (item: Exercise) => <ExerciseRow key={item.id} exercise={item} onPress={() => open({ type:'exercise', id:item.id })} />;
  function showRoutine(plan: Routine) { open({type:'routine', id:plan.id}); }

  const today = <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
    <Intro title="حركتك اليوم" caption="تابع خطواتك وماءك، وخطّط لتمرينك القادم."/>
    <View style={s.hero}>
      <View style={s.row}><Footprints color={accent} size={25}/><Text style={s.heroLabel}>خطوات اليوم</Text></View>
      <Text style={s.heroTotal}>{steps.steps.toLocaleString('ar')}</Text>
      <Text style={s.heroCopy}>{steps.status === 'ready' ? 'هدف اليوم · ٦٬٠٠٠ خطوة' : steps.status === 'permission' ? 'فعّل إذن النشاط لبدء العد' : steps.status === 'checking' ? 'جارٍ فحص مستشعر الحركة' : 'عدّاد الخطوات غير متاح على هذا الجهاز'}</Text>
      <View style={s.track}><View style={[s.fill, {width:`${Math.min(100, steps.steps / 60)}%`}]}/></View>
      {steps.status === 'permission' && <Action onPress={() => void steps.request()}>تفعيل عدّ الخطوات</Action>}
    </View>
    <View style={s.card}>
      <View style={s.row}><Droplets color={deep} size={24}/><Text style={[s.h2, s.grow]}>الماء</Text><Text style={s.small}>أكواب اليوم · {water.toLocaleString('ar')}</Text></View>
      <View style={s.water}>{Array.from({length:8}, (_, i) => <View key={i} style={[s.drop, i < water && s.dropOn]}/>)}</View>
      <View style={s.row}><Action onPress={() => adjustWater(1)}>أضف كوبًا</Action><Action quiet disabled={water === 0} onPress={() => adjustWater(-1)}>تراجع</Action></View>
    </View>
    <View style={s.card}>
      <View style={s.row}><CalendarDays color={deep} size={24}/><Text style={[s.h2,s.grow]}>{activeRoutine?.title ?? 'تمرينك القادم'}</Text></View>
      <Text style={s.copy}>{activeRoutine ? 'افتح جدولك وعلّم الجلسة عند اكتمالها.' : 'ابدأ بثلاث جلسات قصيرة في البيت، أو اختر جدولًا من المكتبة.'}</Text>
      <Action quiet onPress={() => activeRoutine ? showRoutine(activeRoutine) : go('plans')}>{activeRoutine ? 'افتح جدول التدريب' : 'استعرض الجداول'}</Action>
    </View>
  </ScrollView>;

  const library = <FlatList data={filtered} keyExtractor={item => item.id} renderItem={({item}) => row(item)}
    initialNumToRender={10} maxToRenderPerBatch={6} windowSize={5}
    keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={s.content}
    ListHeaderComponent={<>
      <Intro eyebrow="مكتبة الحركة" title="اختر تمرينك" caption="تصفّح حسب العضلة والمعدات، واحفظ التمارين التي تفضّلها."/>
      <View style={s.search}><Search color={muted} size={20}/><TextInput accessibilityLabel="ابحث عن تمرين" value={search} onChangeText={setSearch} placeholder="ابحث باسم التمرين أو العضلة" placeholderTextColor={muted} style={s.input}/></View>
      <View style={s.libraryActions}>
        <View style={s.row}><Chip active={!onlySaved} onPress={() => setOnlySaved(false)}>كل التمارين</Chip><Chip active={onlySaved} onPress={() => setOnlySaved(true)}>المحفوظة</Chip></View>
        <Pressable accessibilityRole="button" accessibilityLabel="فلترة التمارين" style={s.filterButton} onPress={() => setFiltersOpen(true)}>
          <SlidersHorizontal size={17} color={accent}/><Text style={s.filterText}>فلترة{filterCount ? ` · ${filterCount}` : ''}</Text>
        </Pressable>
      </View>
      <View style={s.catalogMeta}><Text style={s.small}>المصدر · openGym</Text><Text style={s.count}>{filtered.length.toLocaleString('ar')} تمرين</Text></View>
    </>}
    ListEmptyComponent={<Text style={s.copy}>ما في نتائج بهذه الخيارات.</Text>}/>;

  const body = <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
    <Intro eyebrow="خريطة العضلات" title="جسمك بالحركة" caption="اضغط على عضلة لتعرف دورها وتشوف التمارين المرتبطة فيها."/>
    <View style={s.bodyCard}>
      <View style={s.row}><Chip active={side==='front'} onPress={() => {setSide('front'); setMuscle('chest');}}>أمام</Chip>
        <Chip active={side==='back'} onPress={() => {setSide('back'); setMuscle('upper-back');}}>خلف</Chip></View>
      <OpenGymBody side={side} selected={muscle} onSelect={setMuscle}/>

    </View>
    <ScrollView ref={muscleChips} horizontal onContentSizeChange={() => muscleChips.current?.scrollToEnd({animated:false})} showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>
      {bodyMuscles[side].map(id => <Chip key={id} active={muscle===id} onPress={() => setMuscle(id)}>{regions[id][0]}</Chip>)}
    </ScrollView>
    <View style={s.card}><Text style={s.h2}>{regionName}</Text><Text style={s.copy}>{regionDescription}</Text>
      {!!regionMuscles.length && <Action quiet onPress={() => {setSearch(''); setOnlySaved(false); setEquipment(null); setCategory(null); setIllustratedOnly(false); setFilter(regionMuscles); go('library');}}>اعرض كل تمارين العضلة</Action>}
    </View>
    {exercises.filter(item => item.primaryMuscles.some(m => regionMuscles.includes(m))).slice(0,3).map(row)}
  </ScrollView>;

  const plans = <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
    <Intro eyebrow="خطط جاهزة" title="اختَر جدولك" caption="اختر مكان التمرين ونوع الحركة، وتابع الجلسات على جهازك."/>
    {routines.map(plan => <View key={plan.id} style={s.card}>
      <View style={s.row}>{plan.premium ? <Crown color={deep} size={22}/> : <Dumbbell color={deep} size={22}/>}
        <Text style={[s.h2,s.grow]}>{plan.title}</Text>{progress.routine===plan.id && <Check color={deep} size={20}/>}</View>
      <Text style={s.copy}>{plan.subtitle}</Text><Action quiet onPress={() => showRoutine(plan)}>افتح الجدول</Action>
    </View>)}
    <View style={s.card}><View style={s.row}><Utensils color={deep} size={22}/><Text style={s.h2}>أفكار وجبات لأسبوع</Text></View>
      <Text style={s.copy}>خيارات عامة للفطور والغداء والعشاء · Pro</Text><Action quiet onPress={() => open({type:'nutrition'})}>افتح جدول الأكل</Action></View>
  </ScrollView>;

  function renderPage(current: Page) {
    if (current.type === 'settings') return <>
      <Text accessibilityRole="header" style={s.title}>الإعدادات</Text>
      <View style={s.card}><Text style={s.h2}>المظهر</Text>
        <View style={s.wrap}>{([['system','حسب الجهاز'],['light','فاتح'],['dark','داكن']] as const).map(([key,label]) =>
          <Chip key={key} active={mode===key} onPress={()=>onThemeChange(key)}>{label}</Chip>)}</View>
      </View>
      <View style={s.card}><Text style={s.h2}>الاشتراك</Text>
        <Action quiet onPress={()=>open({type:'plus'})}>تفاصيل اشتراك Pro</Action></View>
      <View style={s.card}><Text style={s.h2}>مصادر التمارين والرسومات</Text>
        <Text style={s.copy}>كتالوج openGym من Duarte Santos والمساهمين برخصة AGPL 3.0. خريطة العضلات من MuscleMap برخصة MIT. وضعيات التمارين رسومات مولّدة من Marvin Nazari برخصة CC0.</Text>
        <Action quiet onPress={()=>void Linking.openURL('https://github.com/DuarteSantos8/openGym/blob/e4a68a94c42a3c17cbd560d66ce2e46a7048ab99/NOTICE.md')}>تراخيص المصادر</Action>
        <Action quiet onPress={()=>void Linking.openURL('https://github.com/banmon1/healthy-care-offline/tree/v2.0.2')}>مصدر هذا الإصدار</Action>
      </View>
    </>;
    if (current.type === 'exercise') {
      const item = byId.get(current.id);
      if (!item) return null;
      const diagram = exerciseBody(item.primaryMuscles);
      const illustration = exerciseIllustrations[item.id];
      return <>
        <Intro eyebrow={exerciseKind(item)} title={titleFor(item)} caption={[...item.primaryMuscles.map(m => muscles[m] ?? m), gear[item.equipment ?? ''] ?? item.equipment].filter(Boolean).join(' · ')}/>
        {illustration ? <ExerciseMotion illustration={illustration}/> : <View style={s.exerciseHero}>
          <OpenGymBody {...diagram} height={255}/>
          <Text style={s.diagramLabel}>العضلة المستهدفة</Text>
        </View>}
        <Action quiet onPress={() => save(item.id)}>{progress.saved.includes(item.id) ? 'إزالة من المحفوظة' : 'احفظ التمرين'}</Action>
        <>{!!item.description && (item.descriptionLanguage==='ar' || item.instructionLanguage!=='ar') && <Text style={[s.copy, item.descriptionLanguage === 'en' && s.english]}>{item.description}</Text>}<Text style={s.h2}>طريقة التنفيذ</Text></>
        {item.instructionLanguage!=='ar' && <Text style={s.small}>شرح المصدر بالإنجليزية</Text>}
        {item.instructions.map((step,index) => <View key={index} style={[s.card,s.row]}><Text style={s.number}>{index+1}</Text><Text style={[s.copy,s.grow,item.instructionLanguage !== 'ar' && s.english]}>{step}</Text></View>)}
      </>;
    }
    if (current.type === 'routine') {
      const plan = routines.find(item => item.id === current.id);
      if (!plan) return null;
      return <>
        <Intro eyebrow={plan.premium ? 'HEALTH CARE PRO' : 'جدول تدريب'} title={plan.title} caption={plan.subtitle}/>
        {plan.premium && !member.active ?
          <View style={s.card}><Text style={s.h2}>متاح مع Pro</Text><Text style={s.copy}>{plan.days.map(d => d.title).join(' • ')}</Text><Action onPress={() => open({type:'plus'})}>خيارات الاشتراك</Action></View> :
          <><Action onPress={() => setProgress(previous => ({...previous, routine:plan.id}))}>{progress.routine === plan.id ? 'هذا جدولك الحالي' : 'اختر هذا الجدول'}</Action>
          {plan.days.map((session,index) => {
            const id = `${plan.id}.${index}`;
            return <View key={id} style={s.card}><Text style={s.h2}>{session.title}</Text>
              {session.entries.map(([exercise,reps]) => <Pressable accessibilityRole="button" key={exercise} style={s.planLine} disabled={!byId.has(exercise)} onPress={() => open({type:'exercise',id:exercise})}>
                <Text style={[s.h3,s.grow]}>{byId.get(exercise) ? titleFor(byId.get(exercise)!) : exercise}</Text><Text style={s.small}>{reps}</Text></Pressable>)}
              <Action quiet onPress={() => setProgress(previous => {
                const completed = {...previous.completed};
                if (completed[id] === day) delete completed[id]; else completed[id] = day;
                return {...previous, completed};
              })}>{progress.completed[id] === day ? 'تمّت اليوم ✓ · تراجع' : 'تمرين مكتمل'}</Action>
            </View>;
          })}</>}
      </>;
    }
    if (current.type === 'nutrition') return <>
      <Intro eyebrow="HEALTH CARE PRO" title="جدول الأكل" caption="أفكار وجبات عامة لسبعة أيام."/>
      {!member.active ? <View style={s.card}><Text style={s.copy}>مثال فطور: شوفان ولبن وفاكهة.</Text><Action onPress={() => open({type:'plus'})}>خيارات الاشتراك</Action></View> :
        meals.map(meal => <View style={s.card} key={meal.day}><Text style={s.h2}>{meal.day}</Text>
          {meal.options.map((option,i) => <View style={s.planLine} key={option}><Text style={s.small}>{['فطور','غداء','عشاء'][i]}</Text><Text style={[s.h3,s.grow]}>{option}</Text></View>)}</View>)}
    </>;
    return <>
      <Intro eyebrow="HEALTH CARE PRO" title="خلّي خطتك أقرب" caption="جداول تدريب إضافية وأفكار وجبات لأسبوع، مع التقدّم محفوظ على جهازك."/>
      <View style={s.hero}><Crown color={accent} size={32}/><Text style={s.heroPlan}>اشتراك شهري</Text>
        <Text style={s.heroCopy}>{member.active ? 'اشتراكك فعّال' : member.price ? `${member.price} شهريًا · يتجدّد تلقائيًا` : 'السعر يظهر عند توفر الاشتراك في Google Play.'}</Text>
        {member.price && !member.active && <Action disabled={member.busy} onPress={() => void member.buy()}>اشترك عبر Google Play</Action>}
      </View>
      <View style={s.card}><Text style={s.copy}>تقدر تستعيد اشتراكك أو تديره من حسابك على Google Play.</Text>
        <Action quiet disabled={member.busy} onPress={() => void member.restore()}>استعادة الاشتراك</Action>
        <Action quiet onPress={member.manage}>إدارة الاشتراك</Action>
        {!!member.notice && <Text accessibilityLiveRegion="polite" style={s.copy}>{member.notice}</Text>}
      </View>
    </>;
  }
  return <SafeAreaView style={s.safe} edges={['top','bottom']}><StatusBar style={isDark ? "light" : "dark"}/>
    {page ? <><View style={s.header}><Pressable accessibilityRole="button" accessibilityLabel="رجوع" onPress={() => setPages(current => current.slice(0,-1))} style={s.topButton}><ArrowLeft size={24} color={deep}/></Pressable><Text style={s.wordmark}>HEALTH CARE</Text></View>
      <ScrollView key={page.type + ('id' in page ? page.id : '')} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>{renderPage(page)}</ScrollView></> :
      <><View style={s.header}><View style={s.brand}><View style={s.brandIcon}><Activity color="#FFFFFF" size={18}/></View><Text style={s.wordmark}>HEALTH CARE</Text></View>
        <View style={s.settingsActions}><Pressable accessibilityRole="button" accessibilityLabel="الإعدادات" style={s.topButton} onPress={()=>open({type:'settings'})}><Settings size={20} color={deep}/></Pressable><Pressable accessibilityRole="button" onPress={() => open({type:'plus'})} style={s.plus}><Crown size={15} color={deep}/><Text style={s.plusText}>PRO</Text></Pressable></View></View>
        <View style={s.grow}>{tab === 'today' ? today : tab === 'library' ? library : tab === 'body' ? body : plans}</View>
        <View style={s.nav}>{tabs.map(({key,label,Icon}) => <Pressable key={key} accessibilityRole="tab" accessibilityState={{selected:tab===key}} onPress={() => go(key)} style={s.navItem}>
          <View style={[s.navIcon,tab===key&&s.navIconOn]}><Icon size={20} color={tab===key?deep:muted}/></View><Text style={[s.small,tab===key&&s.selectedText]}>{label}</Text>
        </Pressable>)}</View>
      </>}
    <Modal visible={filtersOpen} animationType="slide" onRequestClose={() => setFiltersOpen(false)}>
      <SafeAreaView style={s.safe}>
        <View style={s.filterHeader}>
          <Text style={s.h2}>فلترة التمارين</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="إغلاق الفلاتر" style={s.topButton} onPress={() => setFiltersOpen(false)}><X size={22} color={deep}/></Pressable>
        </View>
        <ScrollView contentContainerStyle={s.filterContent}>
          <Text style={s.h3}>الرسومات</Text>
          <View style={s.wrap}><Chip active={!illustratedOnly} onPress={() => setIllustratedOnly(false)}>كل التمارين</Chip><Chip active={illustratedOnly} onPress={() => setIllustratedOnly(true)}>بتوضيح حركي</Chip></View>
          <Text style={s.h3}>العضلة</Text>
          <View style={s.wrap}><Chip active={!filter.length} onPress={() => setFilter([])}>كل العضلات</Chip>
            {Object.entries(muscles).map(([id,label]) => <Chip key={id} active={filter.includes(id)} onPress={() => setFilter(filter.includes(id) ? filter.filter(value=>value!==id) : [...filter,id])}>{label}</Chip>)}
          </View>
          <Text style={s.h3}>المعدات</Text>
          <View style={s.wrap}><Chip active={!equipment} onPress={() => setEquipment(null)}>كل المعدات</Chip>
            {Object.entries(gear).map(([id,label]) => <Chip key={id} active={equipment===id} onPress={() => setEquipment(equipment===id ? null : id)}>{label}</Chip>)}
          </View>
          <Text style={s.h3}>نوع الحركة</Text>
          <View style={s.wrap}><Chip active={!category} onPress={() => setCategory(null)}>كل الأنواع</Chip>
            {Object.entries(categories).map(([id,label]) => <Chip key={id} active={category===id} onPress={() => setCategory(category===id ? null : id)}>{label}</Chip>)}
          </View>
        </ScrollView>
        <View style={s.filterFooter}>
          <Action onPress={() => setFiltersOpen(false)}>{`عرض ${filtered.length.toLocaleString('ar')} تمرين`}</Action>
          <Action quiet onPress={() => {setFilter([]);setEquipment(null);setCategory(null);setIllustratedOnly(false);}}>مسح الفلاتر</Action>
        </View>
      </SafeAreaView>
    </Modal>
  </SafeAreaView>;
}

export default function App() {
  const [fontsLoaded,fontError] = useFonts({Cairo:require('./assets/fonts/Cairo-Regular.ttf'),CairoBold:require('./assets/fonts/Cairo-Bold.ttf')});
  const system = useColorScheme();
  const [mode,setMode] = useState<ThemeMode>('system');
  const [loaded,setLoaded] = useState(false);
  useEffect(()=>{
    let alive=true;
    void AsyncStorage.getItem(themeKey).then(value=>{
      if (alive && (value==='dark' || value==='light' || value==='system')) setMode(value);
    }).catch(()=>{}).finally(()=>{if(alive)setLoaded(true);});
    return ()=>{alive=false;};
  },[]);
  const changeMode = (next:ThemeMode)=>{
    setMode(next);
    void AsyncStorage.setItem(themeKey,next).catch(()=>{});
  };
  const isDark=mode==='dark' || (mode==='system' && system==='dark');
  const theme=isDark ? darkTheme : lightTheme;
  return <Theme.Provider value={theme}><SafeAreaProvider>{loaded && (fontsLoaded || fontError)
    ? <Healthy mode={mode} isDark={isDark} onThemeChange={changeMode}/>
    : <View style={{flex:1,backgroundColor:theme.colors.paper,alignItems:'center',justifyContent:'center'}}><ActivityIndicator color={theme.colors.accent}/></View>}</SafeAreaProvider></Theme.Provider>;
}

function buildStyles(colors: typeof lightColors) {
  const {ink, muted, paper, accent, deep} = colors;
  return StyleSheet.create({
  safe: {flex:1,backgroundColor:paper},
  grow: {flex:1},
  content: {paddingHorizontal:20,paddingTop:16,paddingBottom:28,gap:16},
  header: {paddingHorizontal:20,minHeight:64,flexDirection:'row',justifyContent:'space-between',alignItems:'center',backgroundColor:colors.card,borderBottomWidth:1,borderColor:colors.border},
  settingsActions: {flexDirection:'row',alignItems:'center',gap:8},
  brand: {flexDirection:'row',gap:9,alignItems:'center'},
  brandIcon: {padding:7,borderRadius:11,backgroundColor:accent},
  wordmark: {color:deep,fontSize:14,letterSpacing:0.8,fontWeight:'700'},
  plus: {flexDirection:'row',alignItems:'center',gap:5,paddingHorizontal:12,paddingVertical:7,borderRadius:12,backgroundColor:colors.warm,borderWidth:1,borderColor:colors.warmBorder},
  plusText: {fontWeight:'700',color:colors.warmText,fontSize:12},
  intro: {gap:5,marginBottom:1},
  eyebrow: {color:colors.warmText,fontWeight:'700',fontSize:12,textAlign:'right'},
  title: {color:ink,fontSize:28,lineHeight:43,fontWeight:'700',textAlign:'right'},
  copy: {color:muted,textAlign:'right',fontSize:13,lineHeight:25},
  small: {color:muted,textAlign:'right',fontSize:11,lineHeight:21},
  h2: {fontSize:18,lineHeight:31,color:ink,fontWeight:'700',textAlign:'right'},
  h3: {fontSize:14,lineHeight:25,color:ink,fontWeight:'700',textAlign:'right'},
  hero: {borderRadius:22,backgroundColor:colors.warm,padding:21,gap:8,alignItems:'flex-end',borderWidth:1,borderColor:colors.warmBorder},
  heroLabel: {color:colors.warmText,fontWeight:'700',fontSize:14},
  heroTotal: {fontWeight:'700',fontSize:62,lineHeight:85,color:colors.warmText},
  heroPlan: {fontWeight:'700',fontSize:27,color:deep},
  heroCopy: {color:colors.warmMuted,fontSize:12,lineHeight:23,textAlign:'right'},
  track: {height:7,borderRadius:8,backgroundColor:colors.track,overflow:'hidden',width:'100%',marginTop:4,alignItems:'flex-end'},
  fill: {backgroundColor:accent,height:'100%'},
  card: {padding:17,gap:11,backgroundColor:colors.card,borderRadius:20,borderWidth:1,borderColor:colors.border},
  row: {flexDirection:I18nManager.isRTL?'row':'row-reverse',alignItems:'center',gap:10},
  action: {minHeight:45,justifyContent:'center',alignItems:'center',paddingHorizontal:16,paddingVertical:8,borderRadius:12,backgroundColor:colors.button},
  actionQuiet: {backgroundColor:colors.warm},
  actionText: {color:'#FFFFFF',fontSize:13,fontWeight:'700',textAlign:'center'},
  disabled: {opacity:0.5},
  water: {flexDirection:'row-reverse',gap:6},
  drop: {height:9,backgroundColor:colors.water,borderRadius:6,flex:1},
  dropOn: {backgroundColor:colors.waterFill},
  search: {flexDirection:'row-reverse',gap:9,alignItems:'center',paddingHorizontal:14,marginTop:10,marginBottom:12,backgroundColor:colors.card,borderWidth:1,borderColor:colors.border,borderRadius:14},
  input: {color:ink,flex:1,minHeight:48,textAlign:'right',fontSize:13,fontFamily:'Cairo'},
  chips: {flexDirection:'row-reverse',gap:8,paddingVertical:5},
  chip: {paddingVertical:7,paddingHorizontal:13,borderRadius:11,backgroundColor:colors.soft,borderWidth:1,borderColor:colors.border},
  chipOn: {backgroundColor:colors.warm,borderColor:colors.warmBorder},
  chipText: {color:colors.muted,fontSize:11,fontWeight:'700'},
  chipTextOn: {color:colors.warmText},
  catalogMeta: {flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingVertical:12},
  count: {color:deep,fontWeight:'700',fontSize:12,textAlign:'right'},
  exercise: {flexDirection:I18nManager.isRTL?'row':'row-reverse',gap:12,alignItems:'center',backgroundColor:colors.card,borderRadius:17,padding:12,borderWidth:1,borderColor:colors.border},
  thumb: {width:62,height:83,borderRadius:12,backgroundColor:colors.soft,alignItems:'center',justifyContent:'center'},
  thumbImage: {width:62,height:83,borderRadius:12,backgroundColor:'#101418'},
  bodyCard: {backgroundColor:colors.card,borderRadius:22,alignItems:'center',padding:18,gap:12,borderWidth:1,borderColor:colors.border},
  exerciseHero: {backgroundColor:colors.card,borderRadius:22,padding:18,alignItems:'center',gap:8,borderWidth:1,borderColor:colors.border},
  diagramLabel: {color:muted,fontSize:11,textAlign:'center'},
  number: {color:colors.warmText,fontWeight:'700',width:30,textAlign:'center',backgroundColor:colors.warm,borderRadius:10,paddingVertical:4},
  english: {textAlign:'left',writingDirection:'ltr'},
  planLine: {flexDirection:'row-reverse',alignItems:'center',gap:10,borderTopWidth:1,borderColor:colors.border,paddingTop:12},
  topButton: {backgroundColor:colors.soft,borderRadius:12,padding:9,minWidth:44,minHeight:44,alignItems:'center',justifyContent:'center'},
  nav: {minHeight:72,backgroundColor:colors.card,flexDirection:'row-reverse',alignItems:'center',borderTopWidth:1,borderColor:colors.border},
  navItem: {flex:1,alignItems:'center',gap:1},
  navIcon: {paddingHorizontal:15,paddingVertical:6,borderRadius:12},
  navIconOn: {backgroundColor:colors.warm},
  selectedText: {fontWeight:'700',color:colors.warmText},
  libraryActions: {flexDirection:'row-reverse',justifyContent:'space-between',alignItems:'center',gap:8},
  filterButton: {flexDirection:'row-reverse',alignItems:'center',gap:6,minHeight:44,paddingHorizontal:10,borderWidth:1,borderColor:colors.border,borderRadius:11,backgroundColor:colors.card},
  filterText: {fontSize:11,color:colors.warmText,fontWeight:'700'},
  filterHeader: {flexDirection:'row-reverse',justifyContent:'space-between',alignItems:'center',padding:20,borderBottomWidth:1,borderColor:colors.border},
  filterContent: {padding:20,gap:15},
  wrap: {flexDirection:'row-reverse',flexWrap:'wrap',gap:8,marginBottom:14},
  filterFooter: {padding:18,gap:10,borderTopWidth:1,borderColor:colors.border,backgroundColor:colors.card},
});
}

const lightTheme = {colors:lightColors,s:buildStyles(lightColors)};
const darkTheme = {colors:darkColors,s:buildStyles(darkColors)};
const Theme = React.createContext(lightTheme);
