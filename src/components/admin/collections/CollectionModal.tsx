"use client";

import React, { useState, useEffect } from "react";
import { Collection } from "@/types";
import { generateSlug } from "@/lib/utils/slug";
import { X, ChevronDown, ChevronUp, AlertCircle, Calendar } from "lucide-react";

interface CollectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (savedCollection: Collection) => void;
  collectionToEdit?: Collection | null;
}

export function CollectionModal({
  isOpen,
  onClose,
  onSuccess,
  collectionToEdit,
}: CollectionModalProps) {
  const isEditing = Boolean(collectionToEdit);

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [isSlugManual, setIsSlugManual] = useState(false);
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [imageAlt, setImageAlt] = useState("");
  const [sortOrder, setSortOrder] = useState(0);
  const [isPublished, setIsPublished] = useState(true);
  const [isFeatured, setIsFeatured] = useState(false);
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");
  const [showSeo, setShowSeo] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (collectionToEdit) {
        setTitle(collectionToEdit.title || collectionToEdit.name || "");
        setSlug(collectionToEdit.slug || "");
        setIsSlugManual(true);
        setDescription(collectionToEdit.description || "");
        setImageUrl(collectionToEdit.imageUrl || "");
        setImageAlt(collectionToEdit.imageAlt || "");
        setSortOrder(collectionToEdit.sortOrder ?? 0);
        setIsPublished(collectionToEdit.isPublished ?? true);
        setIsFeatured(collectionToEdit.isFeatured ?? false);
        setStartsAt(
          collectionToEdit.startsAt ? collectionToEdit.startsAt.substring(0, 10) : ""
        );
        setEndsAt(
          collectionToEdit.endsAt ? collectionToEdit.endsAt.substring(0, 10) : ""
        );
        setSeoTitle(collectionToEdit.seoTitle || "");
        setSeoDescription(collectionToEdit.seoDescription || "");
        setShowSeo(Boolean(collectionToEdit.seoTitle || collectionToEdit.seoDescription));
      } else {
        setTitle("");
        setSlug("");
        setIsSlugManual(false);
        setDescription("");
        setImageUrl("");
        setImageAlt("");
        setSortOrder(0);
        setIsPublished(true);
        setIsFeatured(false);
        setStartsAt("");
        setEndsAt("");
        setSeoTitle("");
        setSeoDescription("");
        setShowSeo(false);
      }
      setErrorMessage(null);
    }
  }, [isOpen, collectionToEdit]);

  if (!isOpen) return null;

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTitle(val);
    if (!isSlugManual) {
      setSlug(generateSlug(val));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    const payload = {
      title: title.trim(),
      slug: slug.trim() || generateSlug(title),
      description: description.trim() || null,
      imageUrl: imageUrl.trim() || null,
      imageAlt: imageAlt.trim() || null,
      sortOrder: Number(sortOrder) || 0,
      isPublished,
      isFeatured,
      startsAt: startsAt ? new Date(startsAt).toISOString() : null,
      endsAt: endsAt ? new Date(endsAt).toISOString() : null,
      seoTitle: seoTitle.trim() || null,
      seoDescription: seoDescription.trim() || null,
    };

    try {
      const url = isEditing
        ? `/api/admin/collections/${collectionToEdit!.id}`
        : "/api/admin/collections";
      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to save collection");
      }

      onSuccess(json.data);
      onClose();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white border border-neutral-200 shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200">
          <div>
            <h3 className="text-base font-bold text-neutral-900">
              {isEditing ? "Edit Collection" : "Create New Collection"}
            </h3>
            <p className="text-xs text-neutral-500">
              {isEditing
                ? `Updating marketing capsule "${collectionToEdit?.title}"`
                : "Curate a marketing story, seasonal edit, or thematic merchandise grouping"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-700 p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 flex items-start gap-2.5 text-xs text-red-800">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Title & Slug */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1.5">
                Collection Title <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={handleTitleChange}
                placeholder="e.g. Winter Weatherproof Capsule"
                className="w-full h-10 border border-neutral-300 px-3 text-xs text-neutral-900 focus:border-neutral-900 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1.5">
                URL Slug <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                required
                value={slug}
                onChange={(e) => {
                  setSlug(e.target.value);
                  setIsSlugManual(true);
                }}
                placeholder="winter-weatherproof"
                className="w-full h-10 border border-neutral-300 px-3 text-xs text-neutral-900 focus:border-neutral-900 focus:outline-none font-mono"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1.5">
              Editorial Description
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Atmospheric narrative and curatorial notes for landing headers..."
              className="w-full border border-neutral-300 p-2.5 text-xs text-neutral-900 focus:border-neutral-900 focus:outline-none"
            />
          </div>

          {/* Image & Alt Text */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1.5">
                Hero Image URL
              </label>
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://images.unsplash.com/..."
                className="w-full h-10 border border-neutral-300 px-3 text-xs text-neutral-900 focus:border-neutral-900 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1.5">
                Image Alt Text
              </label>
              <input
                type="text"
                value={imageAlt}
                onChange={(e) => setImageAlt(e.target.value)}
                placeholder="e.g. Winter footwear editorial backdrop"
                className="w-full h-10 border border-neutral-300 px-3 text-xs text-neutral-900 focus:border-neutral-900 focus:outline-none"
              />
            </div>
          </div>

          {/* Date Window for Seasonal / Capsule Drops */}
          <div className="p-4 bg-neutral-50 border border-neutral-200">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-700 block mb-2">
              Capsule Campaign Window (Optional)
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] text-neutral-600 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startsAt}
                  onChange={(e) => setStartsAt(e.target.value)}
                  className="w-full h-9 border border-neutral-300 px-3 text-xs text-neutral-900 focus:border-neutral-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] text-neutral-600 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={endsAt}
                  onChange={(e) => setEndsAt(e.target.value)}
                  className="w-full h-9 border border-neutral-300 px-3 text-xs text-neutral-900 focus:border-neutral-900 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Sort Order & Toggles */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-neutral-200">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1.5">
                Sort Order
              </label>
              <input
                type="number"
                min="0"
                value={sortOrder}
                onChange={(e) => setSortOrder(Number(e.target.value))}
                className="w-full h-10 border border-neutral-300 px-3 text-xs text-neutral-900 focus:border-neutral-900 focus:outline-none font-mono"
              />
            </div>

            <div className="flex items-center gap-3 sm:pt-6">
              <input
                type="checkbox"
                id="col-is-published"
                checked={isPublished}
                onChange={(e) => setIsPublished(e.target.checked)}
                className="h-4 w-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
              />
              <label htmlFor="col-is-published" className="text-xs font-medium text-neutral-800 cursor-pointer">
                Published
              </label>
            </div>

            <div className="flex items-center gap-3 sm:pt-6">
              <input
                type="checkbox"
                id="col-is-featured"
                checked={isFeatured}
                onChange={(e) => setIsFeatured(e.target.checked)}
                className="h-4 w-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
              />
              <label htmlFor="col-is-featured" className="text-xs font-medium text-neutral-800 cursor-pointer">
                Featured Drop
              </label>
            </div>
          </div>

          {/* SEO Collapsible */}
          <div className="border border-neutral-200">
            <button
              type="button"
              onClick={() => setShowSeo(!showSeo)}
              className="w-full flex items-center justify-between px-4 py-3 bg-neutral-50 text-xs font-semibold uppercase tracking-wider text-neutral-700 hover:bg-neutral-100"
            >
              <span>Search Engine Optimization (SEO)</span>
              {showSeo ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {showSeo && (
              <div className="p-4 space-y-3 bg-white border-t border-neutral-200">
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Meta Title
                  </label>
                  <input
                    type="text"
                    value={seoTitle}
                    onChange={(e) => setSeoTitle(e.target.value)}
                    placeholder={`${title || "Collection"} | Atelier Editions`}
                    className="w-full h-9 border border-neutral-300 px-3 text-xs text-neutral-900 focus:border-neutral-900 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Meta Description
                  </label>
                  <textarea
                    rows={2}
                    value={seoDescription}
                    onChange={(e) => setSeoDescription(e.target.value)}
                    placeholder="Explore our curated capsule collection featuring..."
                    className="w-full border border-neutral-300 p-2 text-xs text-neutral-900 focus:border-neutral-900 focus:outline-none"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Footer Controls */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-neutral-700 border border-neutral-300 hover:bg-neutral-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-semibold uppercase tracking-wider bg-neutral-900 text-white hover:bg-neutral-800 disabled:opacity-50"
            >
              {isSubmitting ? "Saving..." : isEditing ? "Update Collection" : "Create Collection"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
