import { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Pressable, View } from "react-native";
import { Hat } from "../personal/Hat";
import { libraryHat } from "../personal/hatLibrary";
import { attachPackage, packageFor, packageHat } from "../personal/hatPackages";
import { hatDef, isBuiltInHat, isCustomHatId, type PersonalHat } from "../personal/model";
import { HAT_PACKAGES, packageById } from "../personal/packageCatalog";
import { usePersonal } from "../personal/Store";
import { Button, Field, Header, P, Page, Panel, T, sticker, tone } from "../personal/ui";

export default function HatPackages() {
  const params = useLocalSearchParams<{ hat?: string }>();
  const { data, mutate, say } = usePersonal();
  const target: PersonalHat | undefined = isBuiltInHat(params.hat) || (isCustomHatId(params.hat) && data.customHats?.some((h) => h.id === params.hat)) ? params.hat as PersonalHat : undefined;
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState("");
  const chosen = packageById(selected);
  const previous = target ? packageFor(data, target) : undefined;
  const results = HAT_PACKAGES.filter((p) => `${p.name} ${p.subtitle} ${p.tools.join(" ")} ${p.id === "trades" ? "tradesman electrician plumber carpenter construction" : p.id === "police" ? "police cop law enforcement" : ""}`.toLowerCase().includes(query.trim().toLowerCase()));
  const install = () => {
    if (!chosen) return;
    let hat: PersonalHat = "home";
    mutate((d) => { hat = attachPackage(d, chosen.id, target); });
    say(`${chosen.name} tools are ready. Add only the checklists and blocks you want.`);
    router.replace({ pathname: "/hat/[id]", params: { id: hat } });
  };
  return <Page tabs={false}>
    <Header title="A hat. A useful toolkit." subtitle={target ? `Choose tools for ${hatDef(target, data.customHats).name}.` : "Pick the jobs you do. Build a day that fits them."} hat="stack" back />
    {chosen ? <Panel tint={libraryHat(chosen.art).tint}>
      <Hat id={chosen.art} size={64} tilt={-7} />
      <T display size={26}>{chosen.name}</T>
      <T>{chosen.subtitle}</T>
      <T size={12} bold>IN THIS PACKAGE</T>
      {chosen.tools.map((tool) => <T key={tool}>• {tool}</T>)}
      <T size={13} muted>{target && previous && previous.id !== chosen.id ? `Replaces ${previous.name} tools for this hat. ` : ""}Your existing tasks, notes, and calendar stay. Nothing is scheduled until you choose it.</T>
      <Button title={target ? `Use ${chosen.name} tools for this hat` : packageHat(data, chosen.id) ? `Open my ${chosen.name} hat` : `Add ${chosen.name} package`} hat={chosen.art} tone="sun" onPress={install} />
      <Button title="Back to packages" quiet small onPress={() => setSelected("")} />
    </Panel> : <>
      <Panel dark>
        <T display size={23} color="#FFFDFA">More than a different hat.</T>
        <T color="#D5DDE8">Each package brings tools, editable checklists, and time blocks for that job. Capture, memory, and your daily plan connect them.</T>
      </Panel>
      <Field label="Find your job" value={query} onChangeText={setQuery} placeholder="Chef, firefighter, tradesman…" />
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
        {results.map((pack) => {
          const existing = packageHat(data, pack.id);
          return <Pressable key={pack.id} accessibilityRole="button" accessibilityLabel={`Explore ${pack.name} package`} onPress={() => setSelected(pack.id)} style={({ pressed }) => ({ flexGrow: 1, flexBasis: 145, maxWidth: 340, gap: 9, padding: 16, borderRadius: 24, backgroundColor: tone(libraryHat(pack.art).tint), ...sticker(pressed ? 2 : 4), transform: [{ translateY: pressed ? 2 : 0 }] })}>
            <Hat id={pack.art} size={54} />
            <T display size={20}>{pack.name}</T>
            <T size={13} muted>{pack.subtitle}</T>
            <T size={12} bold color={P.ink}>{existing ? "Added · explore tools" : "Explore package →"}</T>
          </Pressable>;
        })}
      </View>
      {!results.length ? <T muted>No matching package yet. Try another job or create your own hat.</T> : null}
      <Button title="Make a custom hat instead" quiet onPress={() => router.push("/hat-new")} />
    </>}
  </Page>;
}
