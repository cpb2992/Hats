import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { fmtRelative, fmtTime } from '../engine/dates';
import { HATS } from '../engine/hats';
import type { Task } from '../engine/types';
import { Icon } from './icons';
import { Patch, tap } from './kit';
import { C, F } from './theme';

export function taskMeta(t: Task, today: string): string {
  const parts: string[] = [HATS[t.hat].name];
  if (t.date && t.date > today) parts.push(fmtRelative(t.date, today));
  if (t.time) parts.push(fmtTime(t.time));
  if (t.student) parts.push(t.student);
  parts.push(`${t.minutes} min`);
  return parts.join(' · ');
}

/** A task line: patch, title and details. Tap to edit; the circle completes it. */
export function TaskRow({ task, today, onDone, last }: { task: Task; today: string; onDone?: () => void; last?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 66, borderBottomWidth: last ? 0 : 1, borderBottomColor: C.line }}>
      <Pressable accessibilityRole="button" accessibilityLabel={`Edit ${task.title}`} onPress={() => { tap(); router.push(`/task/${task.id}`); }} style={({ pressed }) => [{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 10 }, pressed && { opacity: 0.7 }]}>
        <Patch hat={task.hat} size={34} />
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={{ fontFamily: task.done ? F.med : F.semi, fontSize: 15, lineHeight: 20, color: task.done ? C.ink3 : C.ink, textDecorationLine: task.done ? 'line-through' : 'none' }}>{task.title}</Text>
          <Text style={{ fontFamily: F.body, fontSize: 13, color: C.ink2 }}>{taskMeta(task, today)}</Text>
        </View>
      </Pressable>
      {onDone ? (
        <Pressable accessibilityRole="button" accessibilityLabel={task.done ? `Reopen ${task.title}` : `Mark ${task.title} done`} hitSlop={8} onPress={() => { tap(); onDone(); }} style={{ width: 30, height: 30, borderRadius: 15, borderWidth: 1.5, borderColor: task.done ? C.gold : 'rgba(255,255,255,0.22)', backgroundColor: task.done ? C.gold : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
          {task.done ? <Icon name="check" size={15} color={C.onGold} width={3} /> : null}
        </Pressable>
      ) : null}
    </View>
  );
}
