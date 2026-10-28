import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  useWindowDimensions,
  type TextInputProps,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Icon, type IconName } from "../ui/icons";
import { F } from "../ui/theme";
import { HATS, type PersonalTask } from "./model";
import { finishStep, nextStep, reschedule } from "./engine";
import { usePersonal } from "./Store";
import { fmtRelative, fmtTime } from "../engine/dates";

export const P = {
  bg: "#F5F1E9",
  paper: "#FFFDFA",
  ink: "#1D2D45",
  muted: "#617083",
  line: "#DDDCD7",
  soft: "#E9EDF3",
  blue: "#3D65A2",
  orange: "#B45C43",
  warm: "#F3E2D6",
  dark: "#1D2D45",
};
export function T({
  children,
  size = 15,
  muted = false,
  bold = false,
  display = false,
  color,
  style,
}: {
  children: ReactNode;
  size?: number;
  muted?: boolean;
  bold?: boolean;
  display?: boolean;
  color?: string;
  style?: object;
}) {
  return (
    <Text
      style={[
        {
          fontFamily: display ? F.display : bold ? F.semi : F.body,
          fontSize: size,
          lineHeight: size * 1.35,
          color: color ?? (muted ? P.muted : P.ink),
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}
export function Page({
  children,
  tabs = true,
}: {
  children: ReactNode;
  tabs?: boolean;
}) {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: P.bg }}
      contentContainerStyle={{
        paddingTop: insets.top + 18,
        paddingHorizontal: 20,
        paddingBottom: insets.bottom + (tabs ? 115 : 40),
      }}
      keyboardShouldPersistTaps="handled"
    >
      <View
        style={{ width: "100%", maxWidth: 1080, alignSelf: "center", gap: 22 }}
      >
        {children}
      </View>
    </ScrollView>
  );
}
export function Panel({
  children,
  dark = false,
  style,
  onPress,
}: {
  children: ReactNode;
  dark?: boolean;
  style?: ViewStyle;
  onPress?: () => void;
}) {
  const s: ViewStyle = {
    padding: 22,
    borderRadius: 24,
    backgroundColor: dark ? P.dark : P.paper,
    gap: 14,
    ...style,
  };
  return onPress ? (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [s, { opacity: pressed ? 0.88 : 1 }]}
    >
      {children}
    </Pressable>
  ) : (
    <View style={s}>{children}</View>
  );
}
export function Button({
  title,
  onPress,
  quiet = false,
  icon,
  disabled = false,
  small = false,
}: {
  title: string;
  onPress: () => void;
  quiet?: boolean;
  icon?: IconName;
  disabled?: boolean;
  small?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 48,
        paddingHorizontal: small ? 14 : 20,
        paddingVertical: 12,
        borderRadius: 16,
        backgroundColor: quiet ? P.soft : P.ink,
        flexDirection: "row",
        gap: 9,
        justifyContent: "center",
        alignItems: "center",
        opacity: disabled ? 0.4 : pressed ? 0.8 : 1,
      })}
    >
      {icon ? (
        <Icon name={icon} color={quiet ? P.ink : P.paper} size={18} />
      ) : null}
      <T
        size={small ? 13 : 15}
        bold
        color={quiet ? P.ink : P.paper}
        style={{ flexShrink: 1 }}
      >
        {title}
      </T>
    </Pressable>
  );
}
export function Chip({
  title,
  selected = false,
  onPress,
}: {
  title: string;
  selected?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      disabled={!onPress}
      style={{
        minHeight: 44,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 14,
        backgroundColor: selected ? P.ink : P.soft,
        justifyContent: "center",
      }}
    >
      <T size={13} bold color={selected ? P.paper : P.ink}>
        {title}
      </T>
    </Pressable>
  );
}
export function Field({ label, ...props }: TextInputProps & { label: string }) {
  return (
    <View style={{ gap: 7 }}>
      <T size={13} bold>
        {label}
      </T>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={P.muted}
        {...props}
        style={[
          {
            minHeight: 50,
            borderRadius: 14,
            backgroundColor: P.paper,
            borderWidth: 1,
            borderColor: P.line,
            padding: 14,
            fontFamily: F.body,
            fontSize: 16,
            color: P.ink,
            textAlignVertical: props.multiline ? "top" : "center",
          },
          props.style,
        ]}
      />
    </View>
  );
}
export function Row({ children }: { children: ReactNode }) {
  return (
    <View
      style={{
        flexDirection: "row",
        gap: 10,
        alignItems: "center",
        flexWrap: "wrap",
      }}
    >
      {children}
    </View>
  );
}
export function Columns({ children }: { children: ReactNode }) {
  const { width } = useWindowDimensions();
  return (
    <View
      style={{
        flexDirection: width >= 720 ? "row" : "column",
        gap: 18,
        alignItems: "stretch",
      }}
    >
      {children}
    </View>
  );
}
export function Header({
  title,
  subtitle,
  back = false,
}: {
  title: string;
  subtitle?: string;
  back?: boolean;
}) {
  return (
    <View style={{ gap: 16 }}>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        {back ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={() =>
              router.canGoBack() ? router.back() : router.replace("/")
            }
            style={{ minHeight: 44, minWidth: 44, justifyContent: "center" }}
          >
            <Icon name="back" color={P.ink} />
          </Pressable>
        ) : (
          <T display size={27}>
            hats.
          </T>
        )}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Settings and connections"
          onPress={() => router.push("/settings")}
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: P.paper,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon name="settings" color={P.ink} />
        </Pressable>
      </View>
      <View style={{ gap: 7 }}>
        <T display size={34}>
          {title}
        </T>
        {subtitle ? <T muted>{subtitle}</T> : null}
      </View>
    </View>
  );
}
export function Section({
  title,
  action,
  onPress,
}: {
  title: string;
  action?: string;
  onPress?: () => void;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 12,
      }}
    >
      <T size={20} bold>
        {title}
      </T>
      {action ? (
        <Pressable
          accessibilityRole="button"
          onPress={onPress}
          style={{ minHeight: 44, justifyContent: "center" }}
        >
          <T size={13} bold color={P.blue}>
            {action}
          </T>
        </Pressable>
      ) : null}
    </View>
  );
}
export function Empty({
  title,
  detail,
  action,
  onPress,
}: {
  title: string;
  detail?: string;
  action?: string;
  onPress?: () => void;
}) {
  return (
    <Panel>
      <T bold>{title}</T>
      {detail ? <T muted>{detail}</T> : null}
      {action && onPress ? (
        <Button title={action} onPress={onPress} quiet />
      ) : null}
    </Panel>
  );
}
export function Check({
  title,
  done,
  onPress,
}: {
  title: string;
  done: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: done }}
      onPress={onPress}
      style={{
        flexDirection: "row",
        gap: 12,
        alignItems: "center",
        minHeight: 48,
      }}
    >
      <View
        style={{
          height: 26,
          width: 26,
          borderRadius: 8,
          backgroundColor: done ? P.ink : P.soft,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {done ? <Icon name="check" color={P.paper} size={17} /> : null}
      </View>
      <T
        style={{
          flex: 1,
          textDecorationLine: done ? "line-through" : "none",
          opacity: done ? 0.65 : 1,
        }}
      >
        {title}
      </T>
    </Pressable>
  );
}
export function TaskCard({
  task,
  plannedTime,
}: {
  task: PersonalTask;
  plannedTime?: string | null;
}) {
  const { mutate, say, today, nowMin } = usePersonal();
  const current = nextStep(task);
  return (
    <Panel>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <T size={12} bold color={HATS[task.hat].color}>
          {HATS[task.hat].name.toUpperCase()}
          {task.essential ? " · ESSENTIAL" : ""}
        </T>
        <T size={12} muted>
          {fmtRelative(task.date, today)}
          {plannedTime ? ` · ${fmtTime(plannedTime, true)}` : ""}
        </T>
      </View>
      <T size={20} bold>
        {task.title}
      </T>
      {task.steps.length ? (
        <T muted>
          {task.steps.filter((s) => s.done).length} of {task.steps.length} steps
          · Next: {current}
        </T>
      ) : (
        <T muted>
          {task.minutes} minutes{task.fixed ? " · Fixed commitment" : ""}
        </T>
      )}
      {task.note ? <T muted>{task.note}</T> : null}
      <Row>
        <Button
          title={task.steps.length ? `Done: ${current}` : "Done"}
          small
          onPress={() => {
            mutate((d) => {
              const t = d.tasks.find((t) => t.id === task.id);
              if (t) finishStep(t);
            });
            say("Saved. Undo is available above.");
          }}
        />
        {!task.fixed ? (
          <Button
            title="Next opening"
            small
            quiet
            onPress={() => {
              let moved = false;
              mutate((d) => {
                moved = reschedule(d, task.id, today, nowMin);
              });
              say(
                moved
                  ? "Moved to your next available opening."
                  : "No suitable opening in the next two weeks. Edit the task or free up time.",
              );
            }}
          />
        ) : null}
        <Button
          title="Edit"
          small
          quiet
          onPress={() =>
            router.push({ pathname: "/task/[id]", params: { id: task.id } })
          }
        />
      </Row>
    </Panel>
  );
}
export function Loading() {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: P.bg,
        alignItems: "center",
        justifyContent: "center",
        gap: 20,
      }}
    >
      <T display size={42}>
        hats.
      </T>
      <ActivityIndicator color={P.blue} />
    </View>
  );
}
