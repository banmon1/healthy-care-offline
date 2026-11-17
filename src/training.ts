import catalog from './exercise-catalog.json';
import openGym from './opengym/catalogue.json';
import type { BodyMuscle } from './OpenGymBody';

export type Exercise = {
  id: string; name: string; level: string; equipment: string | null;
  primaryMuscles: string[]; secondaryMuscles: string[]; instructions: string[];
  category: string; englishName?: string; description?: string; descriptionLanguage?: string; instructionLanguage?: string; variantOf?: string;
};
export const legacyExercises: Exercise[] = catalog;
const muscleKey = (name: string) => ({
  abs:'abdominals', pectorals:'chest', quads:'quadriceps', spine:'lower back',
} as Record<string,string>)[name] ?? name;
const equipmentKey = (item: string) => /machine|ergometer/.test(item) ? 'machine'
  : ({'body weight':'body only', band:'bands', 'resistance band':'bands', 'olympic barbell':'barbell',
    'stability ball':'exercise ball', 'ez barbell':'e-z curl bar', kettlebell:'kettlebells'} as Record<string,string>)[item] ?? item;
export const exerciseAliases: Record<string, string> = {
  Pushups:'og-0662', Bodyweight_Squat:'og-1197', Plank:'og-0463', Dumbbell_Bench_Press:'og-0289',
  Dumbbell_Lunges:'og-0336', Standing_Dumbbell_Calf_Raise:'og-0417',
  'Wide-Grip_Lat_Pulldown':'og-0198', Seated_Cable_Rows:'og-0861', Leg_Press:'og-0739',
  Side_Lateral_Raise:'og-0334', Dumbbell_Bicep_Curl:'og-0294', Butt_Lift_Bridge:'og-0145',
  Air_Bike:'og-0003', Jumping_Jacks:'og-3094',
};
const featured = ['og-0662','og-1197','og-0463','og-0289','og-0145','og-3094'];
const rank = new Map(featured.map((id,index)=>[id,index]));
export const allOpenGymExercises: Exercise[] = openGym.map(item => ({
  ...item, equipment:equipmentKey(item.equipment), level:'', primaryMuscles:[muscleKey(item.target)],
  secondaryMuscles:item.secondaryMuscles.map(muscleKey),
})).sort((a,b)=>(rank.get(a.id) ?? featured.length) - (rank.get(b.id) ?? featured.length));
export const exercises = allOpenGymExercises.filter(item => !item.variantOf);
export function normalizeSearch(value: string) {
  return value.toLocaleLowerCase().normalize('NFKD').replace(/[\u064B-\u065F\u0670\u0640]/g,'')
    .replace(/[أإآ]/g,'ا').replace(/ى/g,'ي').replace(/[^\p{L}\p{N}]+/gu,' ').trim();
}
export const categories: Record<string,string> = {
  strength:'قوة', calisthenics:'وزن الجسم', isometric:'ثبات', mobility:'مرونة وحركة', cardio:'كارديو',
  combat:'فنون قتالية', olympic:'رفع أولمبي', pilates:'بيلاتس', plyometrics:'قفز وقوة', rehab:'تأهيل', stretching:'إطالة', yoga:'يوغا',
};
export const muscles: Record<string, string> = {
  abdominals: 'البطن', abductors: 'العضلات المُبعِدة', adductors: 'العضلات المُقرِّبة',
  biceps: 'البايسبس', calves: 'السمانة', chest: 'الصدر', forearms: 'الساعد',
  glutes: 'الأرداف', hamstrings: 'خلف الفخذ', lats: 'الظهر العريض', 'lower back': 'أسفل الظهر',
  'middle back': 'وسط الظهر', neck: 'الرقبة', quadriceps: 'مقدمة الفخذ',
  shoulders: 'الأكتاف', 'front delts':'الكتف الأمامي', 'rear delts':'الكتف الخلفي', 'side delts':'الكتف الجانبي', 'upper back':'أعلى الظهر', obliques:'جانبا البطن', 'hip flexors':'مثنيات الورك', shins:'مقدمة الساق', 'cardiovascular system':'القلب والتنفس', 'serratus anterior':'العضلة المنشارية', 'levator scapulae':'رافعة لوح الكتف', traps: 'الترابيس', triceps: 'الترايسبس',
};
export const gear: Record<string, string> = {
  'body only': 'وزن الجسم', dumbbell: 'دمبل', barbell: 'بار حديدي', kettlebells: 'كيتل بيل',
  machine: 'جهاز', cable: 'كيبل', bands: 'أحزمة مقاومة', 'exercise ball': 'كرة تمرين',
  'medicine ball': 'كرة طبية', 'e-z curl bar': 'بار متعرّج', 'foam roll': 'أسطوانة الفوم', other: 'أخرى',
  assisted:'بمساعدة', rope:'حبل', weighted:'أوزان إضافية', 'bosu ball':'كرة بوسو',
  'wheel roller':'عجلة البطن', 'trap bar':'بار سداسي', landmine:'بار لاندماين',
  'weight plate':'قرص أوزان', sandbag:'كيس رمل', macebell:'صولجان أوزان',
  'suspension trainer':'أحزمة تعليق', roller:'أسطوانة', hammer:'مطرقة',
  'stationary bike':'دراجة ثابتة', tire:'إطار', 'massage ball':'كرة تدليك',
};
export const levels: Record<string, string> = { beginner: 'مبتدئ', intermediate: 'متوسط', expert: 'متقدم' };
export const names: Record<string, string> = {
  Pushups: 'تمرين الضغط', Bodyweight_Squat: 'قرفصاء بوزن الجسم', Plank: 'البلانك',
  Dumbbell_Bench_Press: 'ضغط الصدر بالدمبل', Dumbbell_Lunges: 'اندفاع بالدمبل',
  'Dumbbell_One-Arm_Shoulder_Press': 'ضغط كتف بذراع واحدة', Standing_Dumbbell_Calf_Raise: 'رفع السمانة بالدمبل',
  'Wide-Grip_Lat_Pulldown': 'سحب علوي بقبضة واسعة', Seated_Cable_Rows: 'تجديف كيبل جالس',
  Leg_Press: 'ضغط الأرجل', Side_Lateral_Raise: 'رفرفة جانبية', Dumbbell_Bicep_Curl: 'ثني البايسبس بالدمبل',
  Butt_Lift_Bridge: 'جسر الأرداف', Air_Bike: 'دراجة البطن', Jumping_Jacks: 'قفز فتح وضم',
};
export const titleFor = (exercise: Exercise) => names[exercise.id] ?? exercise.name;
type Region = [label: string, description: string, filters: string[]];
export const regions: Record<BodyMuscle, Region> = {
  tibialis:['مقدمة الساق','ترفع مقدمة القدم وتساعد في التحكم بالخطوة أثناء المشي.', ['shins']],
  serratus:['العضلة المنشارية','تساعد في حركة لوح الكتف وثباته عند دفع الذراع.', ['serratus anterior']],
  'hip-flexors':['مثنيات الورك','تساعد على رفع الفخذ وثني مفصل الورك.', ['hip flexors']],
  chest: ['الصدر', 'يساعد على دفع الذراعين وتقريبهما أمام الجسم.', ['chest']],
  'upper-back': ['أعلى الظهر', 'يساعد على سحب الذراع وتثبيت لوح الكتف.', ['lats', 'middle back', 'upper back']],
  'lower-back': ['أسفل الظهر', 'يساعد على بسط الجذع وتثبيت العمود الفقري أثناء الحركة.', ['lower back']],
  trapezius: ['الترابيس', 'تحرّك لوح الكتف وتساعد في ثباته.', ['traps']],
  biceps: ['البايسبس', 'تثني المرفق وتساعد في تدوير الساعد.', ['biceps']],
  triceps: ['الترايسبس', 'تمدّ المرفق عند الدفع.', ['triceps']],
  forearm: ['الساعد', 'يساعد على إحكام القبضة وتحريك الرسغ.', ['forearms']],
  'front-deltoids': ['الكتف الأمامي', 'يرفع الذراع إلى الأمام ويساعد في الدفع للأعلى.', ['front delts', 'shoulders']],
  'back-deltoids': ['الكتف الخلفي', 'يساعد على سحب الذراع للخلف.', ['rear delts', 'shoulders']],
  abs: ['البطن', 'تساعد على ثني الجذع وتثبيته.', ['abdominals']],
  obliques: ['جانبا البطن', 'يساعدان على تدوير الجذع والميل إلى الجانبين.', ['obliques']],
  adductor: ['داخل الفخذ', 'تساعد العضلات المُقرِّبة على تحريك الساق إلى الداخل.', ['adductors']],
  abductors: ['جانب الورك', 'تُبعِد الساق إلى الجانب وتساعد على ثبات الحوض.', ['abductors']],
  hamstring: ['خلف الفخذ', 'تثني هذه العضلات الركبة وتساعد على مدّ الورك.', ['hamstrings']],
  quadriceps: ['مقدمة الفخذ', 'تمدّ هذه العضلات الركبة وتعمل أثناء الصعود والوقوف.', ['quadriceps']],
  calves: ['السمانة', 'تساعد على دفع القدم ورفع الكعب أثناء المشي.', ['calves']],
  gluteal: ['الأرداف', 'تساعد على مدّ الورك وتثبيت الحوض.', ['glutes']],
  head: ['الرأس', 'هذه منطقة مرجعية على الخريطة.', []],
  neck: ['الرقبة', 'تثبّت الرأس وتساعد في تحريكه.', ['neck']],
  knees: ['الركبة', 'مفصل يتحرّك بدعم عضلات الفخذ والساق.', []],
  'left-soleus': ['السمانة اليسرى', 'تساعد هذه العضلة العميقة على رفع الكعب.', ['calves']],
  'right-soleus': ['السمانة اليمنى', 'تساعد هذه العضلة العميقة على رفع الكعب.', ['calves']],
};

export type Routine = {
  id: string; title: string; subtitle: string; premium: boolean;
  days: { title: string; entries: [string, string][] }[];
};
const baseRoutines: Routine[] = [
  { id:'home', title:'بداية من البيت', subtitle:'3 أيام · بدون معدات', premium:false, days:[
    {title:'اليوم 1 · الجسم كامل', entries:[['Bodyweight_Squat','2 × 8'],['Pushups','2 × 6'],['Plank','2 × 20 ث']]},
    {title:'اليوم 2 · الحركة والثبات', entries:[['Butt_Lift_Bridge','2 × 10'],['Air_Bike','2 × 10'],['Plank','2 × 20 ث']]},
    {title:'اليوم 3 · الجسم كامل', entries:[['Bodyweight_Squat','2 × 10'],['Pushups','2 × 8'],['Butt_Lift_Bridge','2 × 12']]},
  ]},
  { id:'strength', title:'أساسيات القوة', subtitle:'3 أيام · نادي · Pro', premium:true, days:[
    {title:'اليوم 1 · الدفع', entries:[['Dumbbell_Bench_Press','3 × 8–10'],['Side_Lateral_Raise','2 × 12'],['Pushups','2 × 8']]},
    {title:'اليوم 2 · الأرجل', entries:[['Leg_Press','3 × 10'],['Dumbbell_Lunges','2 × 8 لكل قدم'],['Standing_Dumbbell_Calf_Raise','2 × 12']]},
    {title:'اليوم 3 · السحب', entries:[['Wide-Grip_Lat_Pulldown','3 × 10'],['Seated_Cable_Rows','3 × 10'],['Dumbbell_Bicep_Curl','2 × 12']]},
  ]},
  { id:'balance', title:'حركة وتوازن', subtitle:'3 أيام · بيت · Pro', premium:true, days:[
    {title:'اليوم 1 · الجذع', entries:[['Plank','3 × 20 ث'],['Air_Bike','2 × 12'],['Butt_Lift_Bridge','2 × 12']]},
    {title:'اليوم 2 · قوة خفيفة', entries:[['Bodyweight_Squat','3 × 10'],['Pushups','2 × 8'],['Plank','2 × 25 ث']]},
    {title:'اليوم 3 · حركة', entries:[['Butt_Lift_Bridge','3 × 12'],['Air_Bike','2 × 12'],['Bodyweight_Squat','2 × 12']]},
  ]},
];
export const routines: Routine[] = baseRoutines.map(plan => ({ ...plan, days:plan.days.map(day => ({...day, entries:day.entries.map(([id,reps]) => [exerciseAliases[id] ?? id,reps])})) }));
export const meals = [
  {day:'اليوم الأول', options:['شوفان ولبن وفاكهة', 'أرز مع حمص وسلطة', 'بيض وخبز حبوب وخضار']},
  {day:'اليوم الثاني', options:['لبنة وخبز حبوب وخيار', 'دجاج مشوي وبرغل وخضار', 'شوربة عدس وسلطة']},
  {day:'اليوم الثالث', options:['لبن وفاكهة ومكسرات', 'سمك أو فاصولياء مع أرز', 'ساندويتش حمص وخضار']},
  {day:'اليوم الرابع', options:['بيض وخبز وخضار', 'مجدّرة وسلطة', 'بطاطا بالفرن ولبن']},
  {day:'اليوم الخامس', options:['شوفان وموز', 'معكرونة بالخضار والفاصولياء', 'عجّة خضار وخبز']},
  {day:'اليوم السادس', options:['جبنة وخبز وخيار', 'دجاج أو توفو مع برغل', 'شوربة خضار وحمص']},
  {day:'اليوم السابع', options:['لبن وشوفان وتوت', 'سمك أو عدس مع بطاطا وسلطة', 'ساندويتش بيض وخضار']},
];
