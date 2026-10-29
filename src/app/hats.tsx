import { router } from "expo-router";
import { Pressable, View } from "react-native";
import { allHats, hatDef } from "../personal/model";
import { usePersonal } from "../personal/Store";
import { Header, P, Page, Panel, T, sticker } from "../personal/ui";
import { Hat } from "../personal/Hat";
export default function Hats() {
  const { data } = usePersonal();
  return (
    <Page tabs={false}>
      <Header
        title="All the hats you wear."
        subtitle="Separate spaces. One personal life."
        hat="stack"
        back
      />
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 14 }}>
        {allHats(data.customHats).map((id, index) => {
          const hat = hatDef(id, data.customHats);
          const open = data.tasks.filter(
            (t) => t.hat === id && !t.doneAt,
          ).length;
          return (
            <Pressable
              key={id}
              accessibilityRole="button"
              accessibilityLabel={`${hat.name}, ${open} open tasks`}
              onPress={() =>
                router.push({ pathname: "/hat/[id]", params: { id } })
              }
              style={({ pressed }) => ({
                flexGrow: 1,
                flexBasis: 145,
                maxWidth: 340,
                minHeight: 170,
                backgroundColor: hat.tint,
                borderRadius: 26,
                padding: 20,
                gap: 10,
                ...sticker(pressed ? 3 : 5),
                transform: [
                  { translateY: pressed ? 2 : 0 },
                  {
                    rotate: pressed ? "0deg" : index % 2 ? "0.8deg" : "-0.8deg",
                  },
                ],
              })}
            >
              <Hat id={hat.art} size={60} tilt={index % 2 ? 8 : -8} />
              <T size={20} display>
                {hat.name}
              </T>
              <T size={13} muted>
                {hat.subtitle}
              </T>
              <T size={12} bold>
                {open
                  ? `${open} open ${open === 1 ? "commitment" : "commitments"}`
                  : "Room for what matters"}
              </T>
            </Pressable>
          );
        })}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add a hat"
          onPress={() => router.push("/hat-new")}
          style={({ pressed }) => ({
            flexGrow: 1,
            flexBasis: 145,
            maxWidth: 340,
            minHeight: 170,
            backgroundColor: P.paper,
            borderRadius: 26,
            padding: 20,
            gap: 8,
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 2.5,
            borderStyle: "dashed",
            borderColor: P.ink,
            transform: [{ translateY: pressed ? 2 : 0 }],
          })}
        >
          <View
            style={{
              width: 60,
              height: 60,
              borderRadius: 30,
              backgroundColor: P.sun,
              alignItems: "center",
              justifyContent: "center",
              ...sticker(4),
            }}
          >
            <T display size={34} style={{ lineHeight: 38 }}>
              +
            </T>
          </View>
          <T size={20} display>
            Add a hat
          </T>
          <T size={13} muted style={{ textAlign: "center" }}>
            Name it and pick one from the library.
          </T>
        </Pressable>
      </View>
      <Panel tint="#FFF0C2">
        <Hat id="crown" size={52} tilt={-6} />
        <T bold>A reminder is support, not a score.</T>
        <T muted>
          Your hats don’t compete. Some days need more care in one area; other
          days have room for music, friends, and fun.
        </T>
      </Panel>
    </Page>
  );
}
