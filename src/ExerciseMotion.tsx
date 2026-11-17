import { useEffect, useState } from 'react';
import { AppState, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Pause, Play } from 'lucide-react-native';
import type { ExerciseIllustration } from './exercise-illustrations';

export function ExerciseMotion({illustration}:{illustration:ExerciseIllustration}) {
  const [frame,setFrame]=useState(0);
  const [playing,setPlaying]=useState(false);
  useEffect(()=>{
    if (!playing) return;
    const interval=setInterval(()=>setFrame(current=>(current+1)%illustration.frames.length),1200);
    const listener=AppState.addEventListener('change',state=>{if(state!=='active')setPlaying(false);});
    return ()=>{clearInterval(interval);listener.remove();};
  },[playing,illustration.frames.length]);
  return <View style={s.card}>
    <View style={[s.image,{aspectRatio:illustration.width/illustration.height}]}>
      {illustration.frames.map((source,index)=><Image key={index} source={source}
        accessibilityLabel={frame===index ? `رسم التمرين · الوضعية ${index+1}` : undefined}
        accessible={frame===index} style={[StyleSheet.absoluteFill,{width:'100%',height:'100%',opacity:frame===index ? 1 : 0}]} resizeMode="contain"/>)}
    </View>
    {illustration.frames.length>1 && <View style={s.controls}>
      <View style={s.positions}>{illustration.frames.map((_,index)=><Pressable key={index}
        accessibilityRole="button" accessibilityLabel={`الوضعية ${index+1}`} accessibilityState={{selected:frame===index}}
        onPress={()=>{setPlaying(false);setFrame(index);}} style={[s.position,frame===index&&s.selected]}>
        <Text style={[s.text,frame===index&&s.selectedText]}>{index+1}</Text>
      </Pressable>)}</View>
      <Pressable accessibilityRole="button" accessibilityLabel={playing?'إيقاف توضيح الحركة':'تشغيل توضيح الحركة'}
        onPress={()=>setPlaying(current=>!current)} style={s.play}>
        {playing?<Pause size={16} color="#FFFFFF"/>:<Play size={16} color="#FFFFFF"/>}
        <Text style={s.playText}>{playing?'إيقاف':'عرض الوضعيات'}</Text>
      </Pressable>
    </View>}
  </View>;
}

const s=StyleSheet.create({
  card:{backgroundColor:'#101418',borderRadius:20,overflow:'hidden'},
  image:{width:'100%',maxHeight:300,minHeight:170},
  controls:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',padding:12,gap:8},
  positions:{flexDirection:'row',gap:6},
  position:{width:42,height:42,borderRadius:11,backgroundColor:'#26303A',alignItems:'center',justifyContent:'center'},
  selected:{backgroundColor:'#FFF0E5'},
  text:{fontFamily:'CairoBold',fontSize:13,color:'#FFFFFF'},
  selectedText:{color:'#A63C0E'},
  play:{flexDirection:'row-reverse',gap:7,alignItems:'center',justifyContent:'center',paddingHorizontal:12,minHeight:42,borderRadius:11,backgroundColor:'#B94713'},
  playText:{fontFamily:'CairoBold',fontSize:11,color:'#FFFFFF'},
});
