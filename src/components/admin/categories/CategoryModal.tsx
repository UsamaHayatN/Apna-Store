"use client";

import React, { useState, useEffect } from "react";
import { Category } from "@/types";
import { generateSlug } from "@/lib/utils/slug";
import { X, ChevronDown, ChevronUp, AlertCircle } from "lucide-react";

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (savedCategory: Category) => void;
  categoryToEdit?: Category | null;
  defaultParentId?: string | null;
  allCategories: Category[];
}

export function CategoryModal({
  isOpen,
  onClose,
  onSuccess,
  categoryToEdit,
  defaultParentId,
  allCategories,
}: CategoryModalProps) {
  const isEditing = Boolean(categoryToEdit);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [isSlugManual, setIsSlugManual] = useState(false);
  const [parentId, setParentId] = useState<string>("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [imageAlt, setImageAlt] = useState("");
  const [sortOrder, setSortOrder] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [isFeatured, setIsFeatured] = useState(false);
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");
  const [showSeo, setShowSeo] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Compute ineligible parent IDs (self + descendants) when editing
  const ineligibleParentIds = React.useMemo(() => {
    if (!categoryToEdit) return new Set<string>();
    const set = new Set<string>([categoryToEdit.id]);

    const collectDescendants = (pid: string) => {
      for (const cat of allCategories) {
        if (cat.parentId === pid) {
          set.add(cat.id);
          collectDescendants(cat.id);
        }
      }
    };
    collectDescendants(categoryToEdit.id);
    return set;
  }, [categoryToEdit, allCategories]);

  useEffect(() => {
    if (isOpen) {
      if (categoryToEdit) {
        setName(categoryToEdit.name || "");
        setSlug(categoryToEdit.slug || "");
        setIsSlugManual(true);
        setParentId(categoryToEdit.parentId || "");
        setDescription(categoryToEdit.description || "");
        setImageUrl(categoryToEdit.imageUrl || "");
        setImageAlt(categoryToEdit.imageAlt || "");
        setSortOrder(categoryToEdit.sortOrder ?? 0);
        setIsActive(categoryToEdit.isActive ?? true);
        setIsFeatured(categoryToEdit.isFeatured ?? false);
        setSeoTitle(categoryToEdit.seoTitle || "");
        setSeoDescription(categoryToEdit.seoDescription || "");
        setShowSeo(Boolean(categoryToEdit.seoTitle || categoryToEdit.seoDescription));
      } else {
        setName("");
        setSlug("");
        setIsSlugManual(false);
        setParentId(defaultParentId || "");
        setDescription("");
        setImageUrl("");
        setImageAlt("");
        setSortOrder(0);
        setIsActive(true);
        setIsFeatured(false);
        setSeoTitle("");
        setSeoDescription("");
        setShowSeo(false);
      }
      setErrorMessage(null);
    }
  }, [isOpen, categoryToEdit, defaultParentId]);

  if (!isOpen) return null;

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setName(val);
    if (!isSlugManual) {
      setSlug(generateSlug(val));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    const payload = {
      name: name.trim(),
      slug: slug.trim() || generateSlug(name),
      parentId: parentId ? parentId : null,
      description: description.trim() || null,
      imageUrl: imageUrl.trim() || null,
      imageAlt: imageAlt.trim() || null,
      sortOrder: Number(sortOrder) || 0,
      isActive,
      isFeatured,
      seoTitle: seoTitle.trim() || null,
      seoDescription: seoDescription.trim() || null,
    };

    try {
      const url = isEditing
        ? `/api/admin/categories/${categoryToEdit!.id}`
        : "/api/admin/categories";
      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to save category");
      }

      onSuccess(json.data);
      onClose();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Find parent path preview
  const parentCategory = allCategories.find((c) => c.id === parentId);
  const pathPreview = parentCategory
    ? `${parentCategory.path || `/${parentCategory.slug}`}/${slug || "new-category"}`
    : `/${slug || "new-category"}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white border border-neutral-200 shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200">
          <div>
            <h3 className="text-base font-bold text-neutral-900">
              {isEditing ? "Edit Category" : "Create New Category"}
            </h3>
            <p className="text-xs text-neutral-500">
              {isEditing
                ? `Updating taxonomy node "${categoryToEdit?.name}"`
                : "Add a new department or subcategory to your catalog hierarchy"}
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

          {/* Parent Category Selector */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1.5">
              Parent Category (Placement)
            </label>
            <select
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
              className="w-full h-10 border border-neutral-300 bg-white px-3 text-xs text-neutral-900 focus:border-neutral-900 focus:outline-none"
            >
              <option value="">— None (Top-Level Root Department) —</option>
              {allCategories.map((cat) => {
                const disabled = ineligibleParentIds.has(cat.id);
                const indent = "— ".repeat(cat.level || 0);
                return (
                  <option
                    key={cat.id}
                    value={cat.id}
                    disabled={disabled}
                  >
                    {indent}
                    {cat.name} {disabled ? "(Current or Subcategory)" : ""}
                  </option>
                );
              })}
            </select>
            <p className="mt-1 text-[11px] text-neutral-500">
              Live Path: <code className="font-mono text-neutral-800">{pathPreview}</code>
            </p>
          </div>

          {/* Name & Slug Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1.5">
                Category Name <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={handleNameChange}
                placeholder="e.g. Oxford Shoes"
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
                placeholder="oxford-shoes"
                className="w-full h-10 border border-neutral-300 px-3 text-xs text-neutral-900 focus:border-neutral-900 focus:outline-none font-mono"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1.5">
              Description
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description for category headers and search indexes..."
              className="w-full border border-neutral-300 p-2.5 text-xs text-neutral-900 focus:border-neutral-900 focus:outline-none"
            />
          </div>

          {/* Image URL & Alt Text */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1.5">
                Cover Image URL
              </label>
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://images.unsplash.com/photo-..."
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
                placeholder="e.g. Oxford dress shoes in dark cognac"
                className="w-full h-10 border border-neutral-300 px-3 text-xs text-neutral-900 focus:border-neutral-900 focus:outline-none"
              />
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
              <span className="text-[10px] text-neutral-400">Lower numbers appear first</span>
            </div>

            <div className="flex items-center gap-3 sm:pt-6">
              <input
                type="checkbox"
                id="cat-is-active"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-4 w-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
              />
              <label htmlFor="cat-is-active" className="text-xs font-medium text-neutral-800 cursor-pointer">
                Active in Catalog
              </label>
            </div>

            <div className="flex items-center gap-3 sm:pt-6">
              <input
                type="checkbox"
                id="cat-is-featured"
                checked={isFeatured}
                onChange={(e) => setIsFeatured(e.target.checked)}
                className="h-4 w-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
              />
              <label htmlFor="cat-is-featured" className="text-xs font-medium text-neutral-800 cursor-pointer">
                Featured Category
              </label>
            </div>
          </div>

          {/* SEO Accordion */}
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
                    placeholder={`${name || "Category"} | Luxury Men's Fashion`}
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
                    placeholder="Discover our handcrafted collection of..."
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
              {isSubmitting ? "Saving..." : isEditing ? "Update Category" : "Create Category"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
