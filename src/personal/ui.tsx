import { useState, type ReactNode } from "react";
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
import { Hat } from "./Hat";
import { haptic } from "./haptics";
import type { HatArtId } from "./hatArt";
import { finishStep, nextStep, reschedule } from "./engine";
import { usePersonal } from "./Store";
import { fmtRelative, fmtTime } from "../engine/dates";

export const P = {
  bg: "#FFF4E3",
  paper: "#FFFDF8",
  ink: "#1D2D45",
  muted: "#56647A",
  line: "#E6D8C3",
  soft: "#EAF1FB",
  blue: "#3D65A2",
  orange: "#B4512F",
  warm: "#FFE6D2",
  dark: "#1D2D45",
  sun: "#F7C948",
  sky: "#CFE3F7",
  peach: "#FFD9C2",
  lilac: "#EDE0FA",
  mint: "#D3F0E8",
};
/** Sticker edge: a dark outline with a chunkier bottom, like a cut-out. */
export const sticker = (lift = 5): ViewStyle => ({
  borderWidth: 2,
  borderColor: P.ink,
  borderBottomWidth: lift,
});
export function T({
  children,
  size = 15,
  muted = false,
  bold = false,
  display = false,
  color,
  style,
  numberOfLines,
}: {
  children: ReactNode;
  size?: number;
  muted?: boolean;
  bold?: boolean;
  display?: boolean;
  color?: string;
  style?: object;
  numberOfLines?: number;
}) {
  return (
    <Text
      numberOfLines={numberOfLines}
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
        paddingTop: insets.top + 10,
        paddingHorizontal: 20,
        paddingBottom: insets.bottom + (tabs ? 115 : 40),
      }}
      keyboardShouldPersistTaps="handled"
    >
      <View
        style={{ width: "100%", maxWidth: 1080, alignSelf: "center", gap: 16 }}
      >
        {children}
      </View>
    </ScrollView>
  );
}
export function Panel({
  children,
  dark = false,
  tint,
  style,
  onPress,
}: {
  children: ReactNode;
  dark?: boolean;
  tint?: string;
  style?: ViewStyle;
  onPress?: () => void;
}) {
  const s: ViewStyle = {
    padding: 17,
    borderRadius: 22,
    backgroundColor: dark ? P.dark : (tint ?? P.paper),
    gap: 10,
    ...sticker(),
    ...style,
  };
  return onPress ? (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        s,
        pressed
          ? {
              transform: [{ translateY: 2 }, { scale: 0.99 }],
              borderBottomWidth: 3,
            }
          : null,
      ]}
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
  hat,
  disabled = false,
  small = false,
  tone,
}: {
  title: string;
  onPress: () => void;
  /** "sun": bright primary for dark surfaces. */
  tone?: "sun";
  quiet?: boolean;
  icon?: IconName;
  hat?: HatArtId;
  disabled?: boolean;
  small?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      disabled={disabled}
      onPress={() => {
        haptic("tap");
        onPress();
      }}
      style={({ pressed }) => ({
        minHeight: 46,
        paddingHorizontal: small ? 12 : 18,
        paddingVertical: 7,
        borderRadius: 18,
        backgroundColor: disabled
          ? P.soft
          : tone === "sun"
            ? P.sun
            : quiet
              ? P.soft
              : P.ink,
        flexDirection: "row",
        gap: 9,
        justifyContent: "center",
        alignItems: "center",
        ...sticker(pressed ? 2 : 4),
        transform: [{ translateY: pressed ? 2 : 0 }],
        opacity: disabled ? 0.55 : 1,
        borderStyle: disabled ? "dashed" : "solid",
      })}
    >
      {hat ? (
        <View
          style={{
            backgroundColor: quiet || tone === "sun" ? "transparent" : P.paper,
            borderRadius: 18,
            padding: quiet ? 0 : 2,
          }}
        >
          <Hat id={hat} size={small ? 24 : 28} />
        </View>
      ) : null}
      {icon && !hat ? (
        <Icon
          name={icon}
          color={quiet || disabled || tone === "sun" ? P.ink : P.paper}
          size={18}
        />
      ) : null}
      <T
        size={small ? 13 : 15}
        bold
        color={quiet || disabled || tone === "sun" ? P.ink : P.paper}
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
      onPress={
        onPress
          ? () => {
              haptic("tap");
              onPress();
            }
          : undefined
      }
      disabled={!onPress}
      style={{
        minHeight: 44,
        paddingHorizontal: 14,
        paddingVertical: 9,
        borderRadius: 22,
        backgroundColor: selected ? P.sun : P.paper,
        borderWidth: 2,
        borderColor: selected ? P.ink : P.line,
        justifyContent: "center",
      }}
    >
      <T size={13} bold color={P.ink}>
        {selected ? "✓ " : ""}
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
            borderRadius: 16,
            backgroundColor: P.paper,
            borderWidth: 2,
            borderColor: P.ink,
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
  hat,
}: {
  title: string;
  subtitle?: string;
  back?: boolean;
  hat?: HatArtId;
}) {
  return (
    <View style={{ gap: 10 }}>
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
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Hat id="cap" size={28} tilt={-10} />
            <T display size={22}>
              hats.
            </T>
          </View>
        )}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Settings and connections"
          onPress={() => router.push("/settings")}
          style={({ pressed }) => ({
            width: 46,
            height: 46,
            borderRadius: 23,
            backgroundColor: P.sun,
            alignItems: "center",
            justifyContent: "center",
            ...sticker(pressed ? 2 : 4),
            transform: [{ translateY: pressed ? 2 : 0 }],
          })}
        >
          <Hat id="hardhat" size={32} />
        </Pressable>
      </View>
      <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 10 }}>
        <View style={{ flex: 1, gap: 4 }}>
          <T display size={27}>
            {title}
          </T>
          {subtitle ? <T muted>{subtitle}</T> : null}
        </View>
        {hat ? <Hat id={hat} size={58} tilt={8} /> : null}
      </View>
    </View>
  );
}
export function Section({
  title,
  action,
  onPress,
  hat,
}: {
  title: string;
  action?: string;
  onPress?: () => void;
  hat?: HatArtId;
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
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          flexShrink: 1,
        }}
      >
        {hat ? <Hat id={hat} size={30} tilt={-6} /> : null}
        <T size={18} bold style={{ flexShrink: 1 }}>
          {title}
        </T>
      </View>
      {action ? (
        <Pressable
          accessibilityRole="button"
          onPress={onPress}
          style={{ minHeight: 44, justifyContent: "center" }}
        >
          <View
            style={{
              backgroundColor: P.paper,
              borderRadius: 16,
              borderWidth: 2,
              borderColor: P.ink,
              paddingHorizontal: 12,
              paddingVertical: 6,
            }}
          >
            <T size={13} bold color={P.ink}>
              + {action}
            </T>
          </View>
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
  hat = "stack",
}: {
  title: string;
  detail?: string;
  action?: string;
  onPress?: () => void;
  hat?: HatArtId;
}) {
  return (
    <Panel>
      <Hat id={hat} size={52} wobble />
      <T bold>{title}</T>
      {detail ? <T muted>{detail}</T> : null}
      {action && onPress ? (
        <Button title={action} onPress={onPress} quiet />
      ) : null}
    </Panel>
  );
}
/** A checkbox. `strike` crosses out finished steps; leave it off for settings toggles. */
export function Check({
  title,
  done,
  onPress,
  strike = false,
}: {
  title: string;
  done: boolean;
  onPress: () => void;
  strike?: boolean;
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
          height: 28,
          width: 28,
          borderRadius: 10,
          backgroundColor: done ? P.sun : P.paper,
          borderWidth: 2,
          borderColor: P.ink,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {done ? <Icon name="check" color={P.ink} size={17} /> : null}
      </View>
      <T
        style={{
          flex: 1,
          textDecorationLine: done && strike ? "line-through" : "none",
          opacity: done && strike ? 0.65 : 1,
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
  const { mutate, say, today, nowMin, celebrate } = usePersonal();
  const current = nextStep(task);
  return (
    <Panel>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 8,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            backgroundColor: HATS[task.hat].tint,
            borderRadius: 16,
            paddingRight: 10,
            paddingLeft: 4,
            paddingVertical: 2,
            flexShrink: 1,
          }}
        >
          <Hat id={HATS[task.hat].art} size={26} />
          <T size={12} bold color={P.ink}>
            {HATS[task.hat].name}
            {task.essential ? " · Essential" : ""}
          </T>
        </View>
        <T size={12} muted>
          {fmtRelative(task.date, today)}
          {plannedTime ? ` · ${fmtTime(plannedTime, true)}` : ""}
        </T>
      </View>
      <T size={18} bold>
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
            const last = task.steps.filter((s) => !s.done).length <= 1;
            say(last ? `${task.title} · all done` : `${current} · done`);
            celebrate({
              hat: HATS[task.hat].art,
              big: last,
              title: last ? "All the way done!" : undefined,
            });
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
      <Hat id="cap" size={96} wobble />
      <T display size={42}>
        hats.
      </T>
      <ActivityIndicator color={P.ink} />
    </View>
  );
}

/** A collapsible settings group: hat, title, one-line summary; tap to open. */
export function Group({
  hat,
  title,
  summary,
  defaultOpen = false,
  children,
}: {
  hat: HatArtId;
  title: string;
  summary?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <View style={{ gap: 10 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => {
          haptic("tap");
          setOpen(!open);
        }}
        style={({ pressed }) => ({
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          padding: 12,
          borderRadius: 20,
          backgroundColor: open ? P.paper : pressed ? P.soft : "transparent",
          borderWidth: 2,
          borderColor: open ? P.ink : P.line,
        })}
      >
        <Hat id={hat} size={34} tilt={-6} />
        <View style={{ flex: 1 }}>
          <T bold size={16}>
            {title}
          </T>
          {summary ? (
            <T size={12} muted numberOfLines={1}>
              {summary}
            </T>
          ) : null}
        </View>
        <T bold size={18}>
          {open ? "–" : "+"}
        </T>
      </Pressable>
      {open ? children : null}
    </View>
  );
}
