import { router } from "expo-router";
import { Pressable, View } from "react-native";
import { HATS, HAT_IDS } from "../../personal/model";
import { usePersonal } from "../../personal/Store";
import { Header, Page, Panel, T, sticker } from "../../personal/ui";
import { Hat } from "../../personal/Hat";
export default function Hats() {
  const { data } = usePersonal();
  return (
    <Page>
      <Header
        title="All the hats you wear."
        subtitle="Separate spaces. One personal life."
        hat="stack"
      />
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 14 }}>
        {HAT_IDS.map((id, index) => {
          const hat = HATS[id];
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
                minHeight: 205,
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
              <Hat id={hat.art} size={78} tilt={index % 2 ? 8 : -8} />
              <T size={23} display>
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
