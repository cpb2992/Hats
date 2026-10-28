import { Platform } from "react-native";
import {
  FlexWidget,
  SvgWidget,
  TextWidget,
  requestPinWidget,
  requestWidgetUpdate,
  type WidgetTaskHandlerProps,
} from "react-native-android-widget";
import { nowMinutes, todayISO } from "../engine/dates";
import { finishStep, nextStep, planDay, reschedule } from "./engine";
import { HATS, type PersonalData } from "./model";
import { hatSvg } from "./hatArt";
import { loadPersonal, savePersonal } from "./storage";
import AsyncStorage from "@react-native-async-storage/async-storage";

export function PersonalWidget({
  data,
  name,
}: {
  data: PersonalData | null;
  name: string;
}) {
  const task = data
    ? planDay(data, todayISO(), nowMinutes()).find((x) => x.time)?.task
    : null;
  const say = name === "HatsSay";
  const home = name === "HatsLog";
  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{
        width: "match_parent",
        height: "match_parent",
        backgroundColor: "#FFF4E3",
        borderRadius: 24,
        borderWidth: 2,
        borderBottomWidth: 5,
        borderColor: "#1D2D45",
        padding: 16,
        flexDirection: "column",
        justifyContent: "space-between",
      }}
    >
      <FlexWidget style={{ flexDirection: "row", alignItems: "center" }}>
        <SvgWidget
          svg={hatSvg(
            say
              ? "wizard"
              : home
                ? "cap"
                : task
                  ? HATS[task.hat].art
                  : "sunhat",
            64,
          )}
          style={{ width: 34, height: 34, marginRight: 8 }}
        />
        <TextWidget
          text={
            say
              ? "HATS · CAPTURE"
              : home
                ? "HATS · HOME LIFE"
                : "HATS · NEXT STEP"
          }
          style={{
            fontSize: 12,
            fontFamily: "InterTight-Bold",
            color: "#1D2D45",
          }}
        />
      </FlexWidget>
      <TextWidget
        text={
          say
            ? "A thought worth keeping."
            : task
              ? nextStep(task)
              : "A little room for what matters."
        }
        maxLines={2}
        style={{
          fontSize: 21,
          fontFamily: "BricolageGrotesque-SemiBold",
          color: "#192A41",
        }}
      />
      {task && !say ? (
        <FlexWidget
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            width: "match_parent",
          }}
        >
          <TextWidget
            text={HATS[task.hat].name}
            style={{ fontSize: 12, color: "#566476" }}
          />
          <FlexWidget
            clickAction="PERSONAL_DONE"
            clickActionData={{ id: task.id }}
            accessibilityLabel="Complete the next step"
            style={{
              padding: 10,
              backgroundColor: "#F7C948",
              borderRadius: 16,
              borderWidth: 2,
              borderColor: "#1D2D45",
            }}
          >
            <TextWidget
              text="Step done ✓"
              style={{ fontSize: 13, color: "#1D2D45" }}
            />
          </FlexWidget>
          <FlexWidget
            clickAction="PERSONAL_LATER"
            clickActionData={{ id: task.id }}
            accessibilityLabel="Move to the next available time"
            style={{ padding: 10 }}
          >
            <TextWidget
              text="Later"
              style={{ fontSize: 13, color: "#192A41" }}
            />
          </FlexWidget>
        </FlexWidget>
      ) : (
        <TextWidget
          text={say ? "Open Hats to talk or type." : "Open your personal plan."}
          style={{ fontSize: 13, color: "#566476" }}
        />
      )}
    </FlexWidget>
  );
}
export async function updatePersonalWidgets(data: PersonalData) {
  if (Platform.OS !== "android") return;
  for (const widgetName of ["HatsNow", "HatsLog", "HatsSay"])
    await requestWidgetUpdate({
      widgetName,
      renderWidget: () => <PersonalWidget data={data} name={widgetName} />,
    }).catch(() => {});
}
export async function pinPersonalWidget() {
  if (Platform.OS !== "android") return false;
  return requestPinWidget({ widgetName: "HatsNow" });
}
export async function personalWidgetHandler(props: WidgetTaskHandlerProps) {
  if (props.widgetAction === "WIDGET_DELETED") return;
  let data: PersonalData | null = null;
  try {
    data = await loadPersonal();
  } catch {
    /* Do not replace unreadable data. */
  }
  if (data && props.widgetAction === "WIDGET_CLICK") {
    const task = data.tasks.find(
      (t) => t.id === String(props.clickActionData?.id ?? ""),
    );
    let changed = false;
    if (task && props.clickAction === "PERSONAL_DONE") {
      finishStep(task);
      changed = true;
    }
    if (task && props.clickAction === "PERSONAL_LATER")
      changed = reschedule(data, task.id, todayISO(), nowMinutes());
    if (changed) {
      data.updatedAt = new Date().toISOString();
      await savePersonal(data);
      const raw = await AsyncStorage.getItem("hats.personal.sync-meta");
      const meta = raw ? JSON.parse(raw) : { owner: null, revision: 0 };
      await AsyncStorage.setItem(
        "hats.personal.sync-meta",
        JSON.stringify({ ...meta, dirty: true }),
      );
      await updatePersonalWidgets(data);
    }
  }
  props.renderWidget(
    <PersonalWidget data={data} name={props.widgetInfo.widgetName} />,
  );
}
