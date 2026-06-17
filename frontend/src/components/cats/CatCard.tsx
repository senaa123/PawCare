"use client";
import { Cat, Edit2, Trash2 } from "lucide-react";
import type { Cat as CatType } from "@/types";
import { timeAgo } from "@/lib/utils";

interface CatCardProps {
  cat:      CatType;
  onEdit:   (cat: CatType) => void;
  onDelete: (id: number)   => void;
}

export default function CatCard({ cat, onEdit, onDelete }: CatCardProps) {
  return (
    <div className="card-hover flex flex-col gap-4">
      {/* Avatar */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-3xl bg-pawblue flex items-center justify-center text-2xl font-bold text-pawblue-dark flex-shrink-0">
            {cat.profile_image_url ? (
              <img
                src={cat.profile_image_url}
                alt={cat.name}
                className="w-full h-full object-cover rounded-3xl"
              />
            ) : (
              <Cat size={26} className="text-pawblue-dark" />
            )}
          </div>
          <div>
            <h3 className="font-display font-bold text-text text-base">{cat.name}</h3>
            <p className="text-text-muted text-sm">{cat.breed ?? "Mixed breed"}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-1">
          <button
            onClick={() => onEdit(cat)}
            className="p-2 rounded-xl hover:bg-pawblue-light text-text-light hover:text-pawblue-dark transition-colors"
          >
            <Edit2 size={15} />
          </button>
          <button
            onClick={() => onDelete(cat.id)}
            className="p-2 rounded-xl hover:bg-red-50 text-text-light hover:text-red-400 transition-colors"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {/* Details */}
      <div className="grid grid-cols-2 gap-2">
        {[
          { label: "Age",    value: cat.age_years != null ? `${cat.age_years} yr` : "—" },
          { label: "Weight", value: cat.weight_kg != null ? `${cat.weight_kg} kg` : "—" },
          { label: "Color",  value: cat.color ?? "—" },
          { label: "Added",  value: timeAgo(cat.created_at) },
        ].map((d) => (
          <div key={d.label} className="bg-muted rounded-2xl px-3 py-2">
            <p className="text-xs text-text-light">{d.label}</p>
            <p className="text-sm font-semibold text-text capitalize">{d.value}</p>
          </div>
        ))}
      </div>

      {cat.notes && (
        <p className="text-xs text-text-muted bg-pawblue-light rounded-2xl px-3 py-2 line-clamp-2">
          {cat.notes}
        </p>
      )}
    </div>
  );
}