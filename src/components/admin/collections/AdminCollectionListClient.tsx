"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { Collection } from "@/types";
import { CollectionModal } from "./CollectionModal";
import {
  Layers,
  Plus,
  Search,
  Star,
  Package,
  Calendar,
  Edit2,
  Trash2,
  RotateCcw,
  ExternalLink,
  SlidersHorizontal,
  ArrowRight,
} from "lucide-react";

interface AdminCollectionListClientProps {
  initialCollections: Collection[];
}

export function AdminCollectionListClient({
  initialCollections,
}: AdminCollectionListClientProps) {
  const [collections, setCollections] = useState<Collection[]>(initialCollections);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "published" | "draft" | "archived">("all");
  const [sortOption, setSortOption] = useState<"sort-order" | "title-asc" | "products-desc" | "created-desc">("sort-order");

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [collectionToEdit, setCollectionToEdit] = useState<Collection | null>(null);
  const [statusNotification, setStatusNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const showNotification = (type: "success" | "error", message: string) => {
    setStatusNotification({ type, message });
    setTimeout(() => setStatusNotification(null), 4000);
  };

  const refreshData = async () => {
    try {
      const res = await fetch("/api/admin/collections?status=all&limit=100");
      const json = await res.json();
      if (json.success && json.items) {
        setCollections(json.items);
      }
    } catch (err) {
      console.error("Failed to refresh collections:", err);
    }
  };

  const handleArchive = async (col: Collection) => {
    try {
      const res = await fetch(`/api/admin/collections/${col.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to archive collection");
      }
      showNotification("success", `Archived collection "${col.title}".`);
      await refreshData();
    } catch (err) {
      showNotification("error", err instanceof Error ? err.message : "Failed to archive collection");
    }
  };

  const handleRestore = async (col: Collection) => {
    try {
      const res = await fetch(`/api/admin/collections/${col.id}/restore`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to restore collection");
      }
      showNotification("success", `Restored collection "${col.title}".`);
      await refreshData();
    } catch (err) {
      showNotification("error", err instanceof Error ? err.message : "Failed to restore collection");
    }
  };

  // Filter and sort collections
  const filteredCollections = useMemo(() => {
    return collections
      .filter((c) => {
        if (statusFilter === "archived") {
          if (!c.deletedAt) return false;
        } else {
          if (c.deletedAt) return false;
          if (statusFilter === "published" && !c.isPublished) return false;
          if (statusFilter === "draft" && c.isPublished) return false;
        }

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchTitle = c.title.toLowerCase().includes(q);
          const matchSlug = c.slug.toLowerCase().includes(q);
          const matchDesc = c.description?.toLowerCase().includes(q);
          if (!matchTitle && !matchSlug && !matchDesc) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortOption === "title-asc") return a.title.localeCompare(b.title);
        if (sortOption === "products-desc") return (b.productCount ?? 0) - (a.productCount ?? 0);
        if (sortOption === "created-desc") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        return a.sortOrder - b.sortOrder;
      });
  }, [collections, searchQuery, statusFilter, sortOption]);

  // Statistics
  const stats = useMemo(() => {
    const unarchived = collections.filter((c) => !c.deletedAt);
    const published = unarchived.filter((c) => c.isPublished);
    const featured = unarchived.filter((c) => c.isFeatured);
    const totalProductsCurated = unarchived.reduce((sum, c) => sum + (c.productCount ?? 0), 0);

    return {
      total: unarchived.length,
      published: published.length,
      featured: featured.length,
      productsCurated: totalProductsCurated,
    };
  }, [collections]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-200">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900">
            Collections & Merchandising Drops
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Curate thematic product groupings, seasonal capsules, and promotional lookbooks.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setCollectionToEdit(null);
            setIsModalOpen(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold uppercase tracking-wider bg-neutral-900 text-white hover:bg-neutral-800 shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Create Collection
        </button>
      </div>

      {statusNotification && (
        <div
          className={`p-3 text-xs font-medium border flex items-center justify-between animate-fade-in ${
            statusNotification.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          <span>{statusNotification.message}</span>
          <button
            type="button"
            onClick={() => setStatusNotification(null)}
            className="text-neutral-400 hover:text-neutral-700"
          >
            &times;
          </button>
        </div>
      )}

      {/* Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 bg-white border border-neutral-200">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 block">
            Total Collections
          </span>
          <span className="text-xl font-bold text-neutral-900 font-mono mt-1 block">
            {stats.total}
          </span>
        </div>

        <div className="p-4 bg-white border border-neutral-200">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 block">
            Published Active
          </span>
          <span className="text-xl font-bold text-emerald-700 font-mono mt-1 block">
            {stats.published}
          </span>
        </div>

        <div className="p-4 bg-white border border-neutral-200">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 block">
            Featured Drops
          </span>
          <span className="text-xl font-bold text-amber-600 font-mono mt-1 block">
            {stats.featured}
          </span>
        </div>

        <div className="p-4 bg-white border border-neutral-200">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 block">
            Products Curated
          </span>
          <span className="text-xl font-bold text-neutral-900 font-mono mt-1 block">
            {stats.productsCurated}
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-3 border border-neutral-200">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* Search Input */}
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search collections..."
              className="w-full h-9 pl-9 pr-3 text-xs border border-neutral-300 focus:border-neutral-900 focus:outline-none"
            />
          </div>

          {/* Status Tabs */}
          <div className="flex items-center border border-neutral-300 overflow-hidden text-xs">
            <button
              type="button"
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-1.5 font-medium transition-colors ${
                statusFilter === "all"
                  ? "bg-neutral-900 text-white"
                  : "bg-white text-neutral-600 hover:bg-neutral-50"
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("published")}
              className={`px-3 py-1.5 font-medium border-l border-neutral-300 transition-colors ${
                statusFilter === "published"
                  ? "bg-neutral-900 text-white"
                  : "bg-white text-neutral-600 hover:bg-neutral-50"
              }`}
            >
              Published
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("draft")}
              className={`px-3 py-1.5 font-medium border-l border-neutral-300 transition-colors ${
                statusFilter === "draft"
                  ? "bg-neutral-900 text-white"
                  : "bg-white text-neutral-600 hover:bg-neutral-50"
              }`}
            >
              Drafts
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("archived")}
              className={`px-3 py-1.5 font-medium border-l border-neutral-300 transition-colors ${
                statusFilter === "archived"
                  ? "bg-neutral-900 text-white"
                  : "bg-white text-neutral-600 hover:bg-neutral-50"
              }`}
            >
              Archived
            </button>
          </div>
        </div>

        {/* Sort Dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-500 hidden sm:inline">Sort:</span>
          <select
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value as typeof sortOption)}
            className="h-9 border border-neutral-300 bg-white px-3 text-xs text-neutral-800 focus:border-neutral-900 focus:outline-none"
          >
            <option value="sort-order">Sort Order</option>
            <option value="title-asc">Title (A-Z)</option>
            <option value="products-desc">Most Products</option>
            <option value="created-desc">Newest First</option>
          </select>
        </div>
      </div>

      {/* Collections Grid */}
      {filteredCollections.length === 0 ? (
        <div className="p-12 text-center bg-white border border-neutral-200">
          <Layers className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
          <p className="text-xs text-neutral-500 font-medium">
            No collections found matching this filter.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredCollections.map((col) => {
            const isArchived = Boolean(col.deletedAt);

            return (
              <div
                key={col.id}
                className="bg-white border border-neutral-200 flex flex-col justify-between hover:border-neutral-400 transition-colors"
              >
                <div>
                  {/* Image banner or fallback header */}
                  {col.imageUrl ? (
                    <div className="relative h-40 w-full overflow-hidden bg-neutral-100 border-b border-neutral-200">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={col.imageUrl}
                        alt={col.imageAlt || col.title}
                        className="w-full h-full object-cover object-center"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-neutral-950/60 to-transparent" />
                      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white">
                        <span className="text-xs font-mono bg-black/40 px-2 py-0.5 backdrop-blur-sm">
                          /{col.slug}
                        </span>
                        {col.isFeatured && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 bg-amber-500 text-neutral-950">
                            <Star className="w-2.5 h-2.5 fill-current" />
                            Featured
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="h-24 w-full bg-neutral-900 border-b border-neutral-200 p-4 flex flex-col justify-between text-white">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-mono tracking-widest text-neutral-400">
                          Collection Capsule
                        </span>
                        {col.isFeatured && (
                          <span className="inline-flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 bg-amber-500 text-neutral-950">
                            <Star className="w-2.5 h-2.5 fill-current" />
                            Featured
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-mono text-neutral-300">
                        /{col.slug}
                      </span>
                    </div>
                  )}

                  {/* Card Content */}
                  <div className="p-5 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-base font-bold text-neutral-900 line-clamp-1">
                        {col.title}
                      </h3>
                      {isArchived ? (
                        <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 bg-red-100 text-red-700 whitespace-nowrap">
                          Archived
                        </span>
                      ) : col.isPublished ? (
                        <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 bg-emerald-100 text-emerald-800 whitespace-nowrap">
                          Published
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 bg-amber-100 text-amber-800 whitespace-nowrap">
                          Draft
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-neutral-600 line-clamp-2 leading-relaxed min-h-[2.5rem]">
                      {col.description || "No curatorial description provided for this collection."}
                    </p>

                    {/* Metadata strip */}
                    <div className="flex items-center justify-between text-xs text-neutral-500 pt-2 border-t border-neutral-100">
                      <span className="inline-flex items-center gap-1.5 font-medium text-neutral-800">
                        <Package className="w-3.5 h-3.5 text-neutral-400" />
                        <strong>{col.productCount ?? 0}</strong> products curated
                      </span>
                      <span className="font-mono text-[11px]">
                        Order #{col.sortOrder}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer Action Links */}
                <div className="px-5 py-3 bg-neutral-50 border-t border-neutral-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setCollectionToEdit(col);
                        setIsModalOpen(true);
                      }}
                      className="p-1.5 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/60 rounded"
                      title="Edit Details"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    {!isArchived ? (
                      <button
                        type="button"
                        onClick={() => handleArchive(col)}
                        className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded"
                        title="Archive Collection"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleRestore(col)}
                        className="p-1.5 text-emerald-700 hover:bg-emerald-50 rounded text-xs inline-flex items-center gap-1"
                        title="Restore Collection"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <Link
                    href={`/admin/collections/${col.id}`}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-neutral-900 hover:text-neutral-600"
                  >
                    <span>Curate Products</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      <CollectionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={async () => {
          await refreshData();
        }}
        collectionToEdit={collectionToEdit}
      />
    </div>
  );
}
