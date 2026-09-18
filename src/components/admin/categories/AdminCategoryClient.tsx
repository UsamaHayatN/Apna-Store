"use client";

import React, { useState, useMemo } from "react";
import { Category } from "@/types";
import { CategoryModal } from "./CategoryModal";
import { CategoryArchiveModal } from "./CategoryArchiveModal";
import {
  FolderTree,
  Table as TableIcon,
  Plus,
  Search,
  ChevronRight,
  ChevronDown,
  Folder,
  Tag,
  Edit2,
  Trash2,
  RotateCcw,
  Star,
  ExternalLink,
  Layers,
  Sparkles,
} from "lucide-react";

interface AdminCategoryClientProps {
  initialCategories: Category[];
  initialTree: Category[];
}

export function AdminCategoryClient({
  initialCategories,
  initialTree,
}: AdminCategoryClientProps) {
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [tree, setTree] = useState<Category[]>(initialTree);
  const [viewMode, setViewMode] = useState<"tree" | "table">("tree");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "archived">("active");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [categoryToEdit, setCategoryToEdit] = useState<Category | null>(null);
  const [defaultParentId, setDefaultParentId] = useState<string | null>(null);

  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [categoryToArchive, setCategoryToArchive] = useState<Category | null>(null);

  // Expanded nodes set in tree view
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(() => {
    // Default: expand all root nodes
    return new Set<string>(initialTree.map((c) => c.id));
  });

  // Re-fetch category data
  const refreshData = async () => {
    try {
      const [listRes, treeRes] = await Promise.all([
        fetch("/api/admin/categories?includeArchived=true&includeInactive=true"),
        fetch("/api/admin/categories?tree=true&includeArchived=true&includeInactive=true"),
      ]);

      const listJson = await listRes.json();
      const treeJson = await treeRes.json();

      if (listJson.success && listJson.data) {
        setCategories(listJson.data);
      }
      if (treeJson.success && treeJson.data) {
        setTree(treeJson.data);
      }
    } catch (err) {
      console.error("Failed to refresh categories:", err);
    }
  };

  // Toggle active status
  const handleToggleActive = async (cat: Category) => {
    const newActive = !cat.isActive;
    // Optimistic update
    setCategories((prev) =>
      prev.map((c) => (c.id === cat.id ? { ...c, isActive: newActive } : c))
    );

    try {
      const res = await fetch(`/api/admin/categories/${cat.id}/toggle-active`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: newActive }),
      });
      if (!res.ok) {
        throw new Error("Failed to update status");
      }
      await refreshData();
    } catch (err) {
      console.error(err);
      // revert
      setCategories((prev) =>
        prev.map((c) => (c.id === cat.id ? { ...c, isActive: cat.isActive } : c))
      );
    }
  };

  // Restore archived category
  const handleRestore = async (cat: Category) => {
    try {
      const res = await fetch(`/api/admin/categories/${cat.id}/restore`, {
        method: "POST",
      });
      if (!res.ok) {
        throw new Error("Failed to restore category");
      }
      await refreshData();
    } catch (err) {
      console.error(err);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAll = () => {
    const allIds = new Set<string>();
    const collect = (nodes: Category[]) => {
      for (const n of nodes) {
        allIds.add(n.id);
        if (n.children && n.children.length > 0) collect(n.children);
      }
    };
    collect(tree);
    setExpandedNodes(allIds);
  };

  const collapseAll = () => {
    setExpandedNodes(new Set());
  };

  // Filtered categories for table view
  const filteredCategories = useMemo(() => {
    return categories.filter((c) => {
      if (filterStatus === "archived" && !c.deletedAt) return false;
      if (filterStatus === "active" && (c.deletedAt || !c.isActive)) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = c.name.toLowerCase().includes(q);
        const matchSlug = c.slug.toLowerCase().includes(q);
        const matchPath = c.path?.toLowerCase().includes(q);
        if (!matchName && !matchSlug && !matchPath) return false;
      }

      return true;
    });
  }, [categories, filterStatus, searchQuery]);

  // High-level statistics
  const stats = useMemo(() => {
    const activeCats = categories.filter((c) => !c.deletedAt && c.isActive);
    const rootCats = activeCats.filter((c) => !c.parentId);
    const subCats = activeCats.filter((c) => Boolean(c.parentId));
    const featuredCats = activeCats.filter((c) => c.isFeatured);
    const totalAssignedProducts = categories.reduce((sum, c) => sum + (c.productCount || 0), 0);

    return {
      total: activeCats.length,
      root: rootCats.length,
      sub: subCats.length,
      featured: featuredCats.length,
      products: totalAssignedProducts,
    };
  }, [categories]);

  // Recursive Tree Node Renderer
  const renderTreeNode = (node: Category, depth = 0) => {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expandedNodes.has(node.id);
    const isArchived = Boolean(node.deletedAt);

    // Apply search filter in tree view if search active
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchesSelf =
        node.name.toLowerCase().includes(q) ||
        node.slug.toLowerCase().includes(q) ||
        (node.path && node.path.toLowerCase().includes(q));

      const hasMatchingChild = (item: Category): boolean => {
        if (
          item.name.toLowerCase().includes(q) ||
          item.slug.toLowerCase().includes(q)
        ) {
          return true;
        }
        return (item.children || []).some(hasMatchingChild);
      };

      if (!matchesSelf && !hasMatchingChild(node)) {
        return null;
      }
    }

    if (filterStatus === "archived" && !isArchived) return null;
    if (filterStatus === "active" && (isArchived || !node.isActive)) return null;

    return (
      <div key={node.id} className="select-none">
        <div
          className={`group flex items-center justify-between py-2.5 px-3 border-b border-neutral-100 hover:bg-neutral-50/80 transition-colors ${
            depth === 0 ? "bg-white font-medium" : "bg-neutral-50/30"
          }`}
          style={{ paddingLeft: `${Math.max(12, depth * 28 + 12)}px` }}
        >
          {/* Left: Expander + Icon + Title + Badges */}
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            {hasChildren ? (
              <button
                type="button"
                onClick={() => toggleExpand(node.id)}
                className="p-1 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-200/50 rounded transition-colors"
                title={isExpanded ? "Collapse" : "Expand"}
              >
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </button>
            ) : (
              <span className="w-6" />
            )}

            {depth === 0 ? (
              <Folder className="w-4 h-4 text-amber-600 flex-shrink-0" />
            ) : (
              <Tag className="w-3.5 h-3.5 text-neutral-400 flex-shrink-0" />
            )}

            <div className="flex items-center gap-2 min-w-0">
              <span className={`text-xs truncate ${isArchived ? "line-through text-neutral-400" : "text-neutral-900"}`}>
                {node.name}
              </span>

              <span className="text-[10px] font-mono text-neutral-600 truncate hidden sm:inline">
                {node.path || `/${node.slug}`}
              </span>

              {depth === 0 && (
                <span className="text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 bg-neutral-100 text-neutral-600 border border-neutral-200">
                  Root
                </span>
              )}

              {node.isFeatured && (
                <span className="inline-flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-200">
                  <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                  Featured
                </span>
              )}

              {isArchived && (
                <span className="text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 bg-red-100 text-red-700">
                  Archived
                </span>
              )}
            </div>
          </div>

          {/* Center: Products count badge */}
          <div className="flex items-center gap-4 px-4">
            <span className="text-[11px] font-mono text-neutral-600 whitespace-nowrap">
              <strong className="text-neutral-900 font-semibold">{node.productCount ?? 0}</strong> products
            </span>

            {/* Active Switch */}
            {!isArchived && (
              <button
                type="button"
                onClick={() => handleToggleActive(node)}
                className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  node.isActive ? "bg-neutral-900" : "bg-neutral-300"
                }`}
                title={node.isActive ? "Category is active. Click to deactivate." : "Category is inactive. Click to activate."}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    node.isActive ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </button>
            )}
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
            {!isArchived ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setCategoryToEdit(null);
                    setDefaultParentId(node.id);
                    setIsModalOpen(true);
                  }}
                  className="p-1.5 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 rounded text-xs inline-flex items-center gap-1"
                  title="Add Subcategory under this node"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span className="text-[10px] hidden md:inline font-medium">Add Child</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setCategoryToEdit(node);
                    setIsModalOpen(true);
                  }}
                  className="p-1.5 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 rounded"
                  title="Edit Category"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setCategoryToArchive(node);
                    setIsArchiveModalOpen(true);
                  }}
                  className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded"
                  title="Archive Category"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => handleRestore(node)}
                className="px-2 py-1 text-[11px] font-medium text-emerald-700 hover:bg-emerald-50 rounded inline-flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                Restore
              </button>
            )}
          </div>
        </div>

        {/* Children Render */}
        {hasChildren && isExpanded && (
          <div>
            {node.children!.map((child) => renderTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-200">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900">
            Category Hierarchy & Taxonomy
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Architect catalog nesting, department routes, and multi-level product classification.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setCategoryToEdit(null);
            setDefaultParentId(null);
            setIsModalOpen(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold uppercase tracking-wider bg-neutral-900 text-white hover:bg-neutral-800 shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Create Category
        </button>
      </div>

      {/* Summary Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-4 bg-white border border-neutral-200">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 block">
            Active Categories
          </span>
          <span className="text-xl font-bold text-neutral-900 font-mono mt-1 block">
            {stats.total}
          </span>
        </div>

        <div className="p-4 bg-white border border-neutral-200">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 block">
            Root Departments
          </span>
          <span className="text-xl font-bold text-neutral-900 font-mono mt-1 block">
            {stats.root}
          </span>
        </div>

        <div className="p-4 bg-white border border-neutral-200">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 block">
            Subcategories
          </span>
          <span className="text-xl font-bold text-neutral-900 font-mono mt-1 block">
            {stats.sub}
          </span>
        </div>

        <div className="p-4 bg-white border border-neutral-200">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 block">
            Featured
          </span>
          <span className="text-xl font-bold text-amber-600 font-mono mt-1 block">
            {stats.featured}
          </span>
        </div>

        <div className="p-4 bg-white border border-neutral-200 col-span-2 sm:col-span-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 block">
            Assigned Products
          </span>
          <span className="text-xl font-bold text-neutral-900 font-mono mt-1 block">
            {stats.products}
          </span>
        </div>
      </div>

      {/* Control Bar: Search + Filter Tabs + View Mode Toggle */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-3 border border-neutral-200">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search category name, slug, or path..."
              className="w-full h-9 pl-9 pr-3 text-xs border border-neutral-300 focus:border-neutral-900 focus:outline-none"
            />
          </div>

          {/* Status Tabs */}
          <div className="flex items-center border border-neutral-300 overflow-hidden text-xs">
            <button
              type="button"
              onClick={() => setFilterStatus("active")}
              className={`px-3 py-1.5 font-medium transition-colors ${
                filterStatus === "active"
                  ? "bg-neutral-900 text-white"
                  : "bg-white text-neutral-600 hover:bg-neutral-50"
              }`}
            >
              Active
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus("all")}
              className={`px-3 py-1.5 font-medium border-l border-neutral-300 transition-colors ${
                filterStatus === "all"
                  ? "bg-neutral-900 text-white"
                  : "bg-white text-neutral-600 hover:bg-neutral-50"
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus("archived")}
              className={`px-3 py-1.5 font-medium border-l border-neutral-300 transition-colors ${
                filterStatus === "archived"
                  ? "bg-neutral-900 text-white"
                  : "bg-white text-neutral-600 hover:bg-neutral-50"
              }`}
            >
              Archived
            </button>
          </div>
        </div>

        {/* View Switcher & Tree Expand/Collapse */}
        <div className="flex items-center gap-2">
          {viewMode === "tree" && (
            <div className="flex items-center gap-1 mr-2 text-xs">
              <button
                type="button"
                onClick={expandAll}
                className="px-2.5 py-1 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded text-[11px]"
              >
                Expand All
              </button>
              <span className="text-neutral-300">|</span>
              <button
                type="button"
                onClick={collapseAll}
                className="px-2.5 py-1 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded text-[11px]"
              >
                Collapse All
              </button>
            </div>
          )}

          <div className="flex items-center border border-neutral-300 overflow-hidden text-xs">
            <button
              type="button"
              onClick={() => setViewMode("tree")}
              className={`px-3 py-1.5 inline-flex items-center gap-1.5 font-medium transition-colors ${
                viewMode === "tree"
                  ? "bg-neutral-900 text-white"
                  : "bg-white text-neutral-600 hover:bg-neutral-50"
              }`}
              title="Hierarchy Tree View"
            >
              <FolderTree className="w-3.5 h-3.5" />
              <span>Tree</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`px-3 py-1.5 inline-flex items-center gap-1.5 font-medium border-l border-neutral-300 transition-colors ${
                viewMode === "table"
                  ? "bg-neutral-900 text-white"
                  : "bg-white text-neutral-600 hover:bg-neutral-50"
              }`}
              title="Data Table View"
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>Table</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="bg-white border border-neutral-200">
        {viewMode === "tree" ? (
          /* Tree View */
          <div className="divide-y divide-neutral-100">
            {tree.length === 0 ? (
              <div className="p-12 text-center text-xs text-neutral-500">
                No categories found matching this filter.
              </div>
            ) : (
              tree.map((rootNode) => renderTreeNode(rootNode, 0))
            )}
          </div>
        ) : (
          /* Table View */
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-neutral-200 bg-neutral-50 text-[11px] font-semibold uppercase tracking-wider text-neutral-600">
                  <th className="py-3 px-4">Name & Slug</th>
                  <th className="py-3 px-4">Hierarchy Path</th>
                  <th className="py-3 px-4">Level</th>
                  <th className="py-3 px-4 text-right">Products</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Featured</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 text-xs">
                {filteredCategories.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-neutral-500">
                      No categories found.
                    </td>
                  </tr>
                ) : (
                  filteredCategories.map((cat) => (
                    <tr key={cat.id} className="hover:bg-neutral-50 transition-colors">
                      <td className="py-3 px-4 font-medium text-neutral-900">
                        <div className="flex items-center gap-2">
                          {cat.parentId ? (
                            <Tag className="w-3.5 h-3.5 text-neutral-400" />
                          ) : (
                            <Folder className="w-4 h-4 text-amber-600" />
                          )}
                          <div>
                            <p>{cat.name}</p>
                            <p className="text-[10px] font-mono text-neutral-400">{cat.slug}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-neutral-600">
                        {cat.path || `/${cat.slug}`}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-neutral-100 text-neutral-700">
                          {cat.level === 0 ? "Root" : `Level ${cat.level}`}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono">
                        {cat.productCount ?? 0}
                      </td>
                      <td className="py-3 px-4">
                        <button
                          type="button"
                          onClick={() => handleToggleActive(cat)}
                          className={`px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded ${
                            cat.isActive
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-neutral-100 text-neutral-500 border border-neutral-200"
                          }`}
                        >
                          {cat.isActive ? "Active" : "Inactive"}
                        </button>
                      </td>
                      <td className="py-3 px-4">
                        {cat.isFeatured ? (
                          <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                        ) : (
                          <span className="text-neutral-300">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right space-x-2">
                        <button
                          type="button"
                          onClick={() => {
                            setCategoryToEdit(cat);
                            setIsModalOpen(true);
                          }}
                          className="text-neutral-600 hover:text-neutral-900 text-xs"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setCategoryToArchive(cat);
                            setIsArchiveModalOpen(true);
                          }}
                          className="text-red-600 hover:text-red-800 text-xs"
                        >
                          Archive
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      <CategoryModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={async () => {
          await refreshData();
        }}
        categoryToEdit={categoryToEdit}
        defaultParentId={defaultParentId}
        allCategories={categories}
      />

      <CategoryArchiveModal
        isOpen={isArchiveModalOpen}
        onClose={() => setIsArchiveModalOpen(false)}
        onSuccess={async () => {
          await refreshData();
        }}
        category={categoryToArchive}
      />
    </div>
  );
}
