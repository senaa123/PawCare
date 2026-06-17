"use client";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { X, Loader2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { catsApi } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { Cat } from "@/types";

const schema = z.object({
  name:      z.string().min(1, "Name is required"),
  breed:     z.string().optional(),
  age_years: z.coerce.number().min(0).max(30).optional().or(z.literal("")),
  weight_kg: z.coerce.number().min(0).max(30).optional().or(z.literal("")),
  color:     z.string().optional(),
  notes:     z.string().optional(),
});
type FormData = z.infer<typeof schema>;

interface Props {
  open:     boolean;
  onClose:  () => void;
  editing?: Cat | null;
}

export default function AddCatModal({ open, onClose, editing }: Props) {
  const qc = useQueryClient();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema) as any,
  });

  // Pre-fill form when editing
  useEffect(() => {
    if (editing) {
      reset({
        name:      editing.name,
        breed:     editing.breed ?? "",
        age_years: editing.age_years ?? "",
        weight_kg: editing.weight_kg ?? "",
        color:     editing.color ?? "",
        notes:     editing.notes ?? "",
      });
    } else {
      reset({});
    }
  }, [editing, reset]);

  const mutation = useMutation({
    mutationFn: (data: FormData) => {
      const payload = {
        name:      data.name,
        breed:     data.breed || undefined,
        age_years: data.age_years !== "" ? Number(data.age_years) : undefined,
        weight_kg: data.weight_kg !== "" ? Number(data.weight_kg) : undefined,
        color:     data.color || undefined,
        notes:     data.notes || undefined,
      };
      return editing
        ? catsApi.update(editing.id, payload)
        : catsApi.create(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cats"] });
      onClose();
      reset({});
    },
  });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/20 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-3xl shadow-cardHover w-full max-w-md p-6 animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display font-bold text-text text-xl">
            {editing ? "Edit cat profile" : "Add a new cat"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-2xl hover:bg-muted text-text-light hover:text-text transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {mutation.isError && (
          <div className="mb-4 px-4 py-3 bg-red-50 text-red-600 rounded-2xl text-sm">
            Something went wrong. Please try again.
          </div>
        )}

        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
          <div>
            <label className="label">Name *</label>
            <input {...register("name")} placeholder="e.g. Luna" className={cn("input-field", errors.name && "input-error")} />
            {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Breed</label>
              <input {...register("breed")} placeholder="e.g. Tabby" className="input-field" />
            </div>
            <div>
              <label className="label">Color</label>
              <input {...register("color")} placeholder="e.g. Orange" className="input-field" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Age (years)</label>
              <input {...register("age_years")} type="number" min="0" step="0.5" placeholder="e.g. 2" className="input-field" />
            </div>
            <div>
              <label className="label">Weight (kg)</label>
              <input {...register("weight_kg")} type="number" min="0" step="0.1" placeholder="e.g. 4.2" className="input-field" />
            </div>
          </div>

          <div>
            <label className="label">Notes</label>
            <textarea
              {...register("notes")}
              rows={2}
              placeholder="Any special info about this cat…"
              className="input-field resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost flex-1">
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="btn-primary flex-1 flex items-center justify-center gap-2"
            >
              {mutation.isPending ? (
                <><Loader2 size={16} className="animate-spin" /> Saving…</>
              ) : editing ? "Save changes" : "Add cat"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}