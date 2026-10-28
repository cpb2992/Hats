import { router } from "expo-router";
import { Pressable, View } from "react-native";
import { HATS, HAT_IDS } from "../../personal/model";
import { usePersonal } from "../../personal/Store";
import { Header, P, Page, Panel, T } from "../../personal/ui";
import { Icon } from "../../ui/icons";
export default function Hats() {
  const { data } = usePersonal();
  return (
    <Page>
      <Header
        title="All the hats you wear."
        subtitle="Separate spaces. One personal life."
      />
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 14 }}>
        {HAT_IDS.map((id) => {
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
              style={{
                flexGrow: 1,
                flexBasis: 145,
                maxWidth: 340,
                minHeight: 205,
                backgroundColor: P.paper,
                borderRadius: 24,
                padding: 22,
                gap: 14,
              }}
            >
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 14,
                  backgroundColor: P.soft,
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Icon name={hat.icon} color={hat.color} />
              </View>
              <T size={23} display>
                {hat.name}
              </T>
              <T size={13} muted>
                {hat.subtitle}
              </T>
              <T size={12} bold color={hat.color}>
                {open
                  ? `${open} open ${open === 1 ? "commitment" : "commitments"}`
                  : "Room for what matters"}
              </T>
            </Pressable>
          );
        })}
      </View>
      <Panel>
        <T bold>A reminder is support, not a score.</T>
        <T muted>
          Your hats don’t compete. Some days need more care in one area; other
          days have room for music, friends, and fun.
        </T>
      </Panel>
    </Page>
  );
}
