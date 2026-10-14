import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function ExtraListEditor<T extends Record<string, string>>({
  title,
  items,
  blank,
  fields,
  onChange,
  disabled = false,
}: {
  title: string;
  items: T[];
  blank: T;
  fields: { key: keyof T; label: string; textarea?: boolean }[];
  onChange: (items: T[]) => void;
  disabled?: boolean;
}) {
  return (
    <section className="rounded-xl border border-border bg-card p-6 shadow-card">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold">{title}</h2>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => onChange([...items, { ...blank }])}
          disabled={disabled}
        >
          Add
        </Button>
      </div>
      <div className="mt-4 space-y-4">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing added yet.</p>
        ) : (
          items.map((item, index) => (
            <div key={`${title}-${index}`} className="rounded-lg border border-border p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                {fields.map((field) => (
                  <div
                    key={String(field.key)}
                    className={field.textarea ? "sm:col-span-2 space-y-2" : "space-y-2"}
                  >
                    <Label>{field.label}</Label>
                    {field.textarea ? (
                      <Textarea
                        rows={2}
                        value={item[field.key]}
                        onChange={(event) => {
                          const next = [...items];
                          next[index] = { ...item, [field.key]: event.target.value };
                          onChange(next);
                        }}
                        disabled={disabled}
                      />
                    ) : (
                      <Input
                        value={item[field.key]}
                        onChange={(event) => {
                          const next = [...items];
                          next[index] = { ...item, [field.key]: event.target.value };
                          onChange(next);
                        }}
                        disabled={disabled}
                      />
                    )}
                  </div>
                ))}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="mt-3"
                onClick={() => onChange(items.filter((_, itemIndex) => itemIndex !== index))}
                disabled={disabled}
              >
                Remove
              </Button>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
