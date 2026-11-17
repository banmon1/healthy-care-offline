import Svg, { Path } from 'react-native-svg';
import bodyPaths from './opengym/body-paths.json';
export type BodyMuscle =
  | "trapezius"
  | "upper-back"
  | "lower-back"
  | "chest"
  | "biceps"
  | "triceps"
  | "forearm"
  | "back-deltoids"
  | "front-deltoids"
  | "abs"
  | "obliques"
  | "adductor"
  | "abductors"
  | "hamstring"
  | "quadriceps"
  | "calves"
  | "gluteal"
  | "head"
  | "neck"
  | "knees"
  | "left-soleus"
  | "right-soleus"
  | 'tibialis' | 'serratus' | 'hip-flexors';

const shared: Record<string,BodyMuscle> = {
  chest:'chest', abs:'abs', biceps:'biceps', triceps:'triceps', obliques:'obliques',
  quadriceps:'quadriceps', calves:'calves', adductors:'adductor', trapezius:'trapezius',
  neck:'neck', forearm:'forearm', 'upper-back':'upper-back', 'lower-back':'lower-back',
  gluteal:'gluteal', hamstring:'hamstring', tibialis:'tibialis', serratus:'serratus',
  'hip-flexors':'hip-flexors',
};

export const bodyMuscles: Record<'front' | 'back',BodyMuscle[]> = {
  front:['chest','front-deltoids','biceps','triceps','forearm','abs','obliques','serratus','hip-flexors','adductor','quadriceps','tibialis','calves','trapezius','neck'],
  back:['upper-back','lower-back','trapezius','back-deltoids','triceps','forearm','gluteal','hamstring','adductor','calves','neck'],
};

export function OpenGymBody({ side='front', selected, onSelect, height=310, width='100%' }: {
  side?: 'front' | 'back'; selected?: BodyMuscle; onSelect?: (muscle:BodyMuscle)=>void;
  height?: number; width?: number | string;
}) {
  const geometry=bodyPaths.male[side];
  return <Svg width={width} height={height} viewBox={geometry.vb} accessibilityLabel={onSelect ? 'خريطة عضلات قابلة للاختيار' : 'العضلة المستهدفة'}>
    {Object.entries(geometry.p).flatMap(([part,paths]) => {
      const muscle=part==='deltoids' ? (side==='front' ? 'front-deltoids' : 'back-deltoids') : shared[part];
      return paths.map((path,index)=><Path key={part+index} d={path}
        fill={muscle && muscle===selected ? '#F06B2A' : muscle ? '#DADDE1' : '#E9EBEE'}
        stroke="#FFFFFF" strokeWidth={2.1}
        onPress={muscle && onSelect ? ()=>onSelect(muscle) : undefined}
        accessibilityLabel={muscle && onSelect ? muscle : undefined}
      />);
    })}
  </Svg>;
}

const muscleRegions: Record<string,BodyMuscle> = {
  chest:'chest', abdominals:'abs', obliques:'obliques', biceps:'biceps', triceps:'triceps',
  quadriceps:'quadriceps', calves:'calves', adductors:'adductor', abductors:'abductors',
  traps:'trapezius', neck:'neck', forearms:'forearm', lats:'upper-back',
  'upper back':'upper-back', 'middle back':'upper-back', 'lower back':'lower-back',
  glutes:'gluteal', hamstrings:'hamstring', shoulders:'front-deltoids',
  'front delts':'front-deltoids', 'rear delts':'back-deltoids', 'side delts':'front-deltoids',
  'serratus anterior':'serratus', 'hip flexors':'hip-flexors', shins:'tibialis',
};
const backMuscles=new Set<BodyMuscle>(['upper-back','lower-back','trapezius','gluteal','hamstring','back-deltoids','triceps']);
export function exerciseBody(primaryMuscles:string[]) {
  const selected=primaryMuscles.map(muscle=>muscleRegions[muscle]).find(Boolean);
  return {selected,side:selected && backMuscles.has(selected) ? 'back' as const : 'front' as const};
}
