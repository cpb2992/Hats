import { useState, type ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  View,
} from "react-native";
import { Button, Chip, Field, P, Row, T } from "./ui";

interface Input {
  key: string;
  label: string;
  value?: string;
  placeholder?: string;
  multiline?: boolean;
  numeric?: boolean;
  options?: string[];
}
interface Form {
  title: string;
  detail?: string;
  fields: Input[];
  saveTitle?: string;
  onSave: (values: Record<string, string>) => void | Promise<void>;
}
export function useEditor(): { open: (form: Form) => void; node: ReactNode } {
  const [form, setForm] = useState<Form | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const open = (next: Form) => {
    setValues(
      Object.fromEntries(next.fields.map((f) => [f.key, f.value ?? ""])),
    );
    setError("");
    setForm(next);
  };
  const node = (
    <Modal
      visible={!!form}
      transparent
      animationType="slide"
      onRequestClose={() => {
        if (!busy) setForm(null);
      }}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{
          flex: 1,
          backgroundColor: "#17243A88",
          justifyContent: "flex-end",
        }}
      >
        <View
          style={{
            backgroundColor: P.bg,
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            maxHeight: "90%",
            padding: 24,
            width: "100%",
            maxWidth: 620,
            alignSelf: "center",
          }}
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ gap: 18, paddingBottom: 24 }}
          >
            <T display size={27}>
              {form?.title}
            </T>
            {form?.detail ? <T muted>{form.detail}</T> : null}
            {form?.fields.map((field) =>
              field.options ? (
                <View key={field.key} style={{ gap: 8 }}>
                  <T size={13} bold>
                    {field.label}
                  </T>
                  <Row>
                    {field.options.map((option) => (
                      <Chip
                        key={option}
                        title={option}
                        selected={values[field.key] === option}
                        onPress={() =>
                          setValues((v) => ({ ...v, [field.key]: option }))
                        }
                      />
                    ))}
                  </Row>
                </View>
              ) : (
                <Field
                  key={field.key}
                  label={field.label}
                  placeholder={field.placeholder}
                  value={values[field.key] ?? ""}
                  onChangeText={(value) =>
                    setValues((v) => ({ ...v, [field.key]: value }))
                  }
                  multiline={field.multiline}
                  keyboardType={field.numeric ? "decimal-pad" : "default"}
                  style={field.multiline ? { minHeight: 110 } : undefined}
                />
              ),
            )}
            {error ? <T color={P.orange}>{error}</T> : null}
            <Row>
              <Button
                title={busy ? "Saving…" : (form?.saveTitle ?? "Save")}
                disabled={busy}
                onPress={() => {
                  if (!form) return;
                  setBusy(true);
                  Promise.resolve()
                    .then(() => form.onSave(values))
                    .then(() => setForm(null))
                    .catch((e) =>
                      setError(
                        e instanceof Error ? e.message : "Could not save.",
                      ),
                    )
                    .finally(() => setBusy(false));
                }}
              />
              <Button
                title="Cancel"
                quiet
                disabled={busy}
                onPress={() => setForm(null)}
              />
            </Row>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
  return { open, node };
}
export function required(value: string, label: string) {
  if (!value.trim()) throw new Error(`Add ${label}.`);
  return value.trim();
}
export function amount(value: string, zero = false) {
  const n = Number(value.replace(/[$,]/g, ""));
  if (!Number.isFinite(n) || (zero ? n < 0 : n <= 0))
    throw new Error("Use a valid dollar amount.");
  return Math.round(n * 100) / 100;
}
