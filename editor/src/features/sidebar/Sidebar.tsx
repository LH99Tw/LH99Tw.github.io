import { useEffect, useMemo, useState } from "react";
import type { CategoryGroup, PostSummary } from "../../../shared/types";

interface SidebarProps {
  categories: CategoryGroup[];
  activeCategoryId: string;
  posts: PostSummary[];
  selectedFilePath: string;
  searchQuery: string;
  onSearchQuery: (value: string) => void;
  onSelectCategory: (categoryId: string) => void;
  onSelectPost: (filePath: string) => void;
  onCreateDraft: () => void;
  onOpenCategoryManager: () => void;
}

export default function Sidebar({
  categories,
  activeCategoryId,
  posts,
  selectedFilePath,
  searchQuery,
  onSearchQuery,
  onSelectCategory,
  onSelectPost,
  onCreateDraft,
  onOpenCategoryManager
}: SidebarProps) {
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({});

  const visiblePosts = useMemo(() => {
    const keyword = searchQuery.trim().toLowerCase();
    if (!keyword) {
      return posts;
    }

    return posts.filter((post) => {
      const haystack = `${post.title} ${post.description} ${post.tags.join(" ")}`.toLowerCase();
      return haystack.includes(keyword);
    });
  }, [posts, searchQuery]);

  const postsByCategory = useMemo(() => {
    const map = new Map<string, PostSummary[]>();

    for (const post of visiblePosts) {
      for (const category of post.categories) {
        if (!map.has(category)) {
          map.set(category, []);
        }
        map.get(category)!.push(post);
      }
    }

    for (const [key, values] of map.entries()) {
      values.sort((a, b) => b.date.localeCompare(a.date));
      map.set(key, values);
    }

    return map;
  }, [visiblePosts]);
  const isSearching = searchQuery.trim().length > 0;

  useEffect(() => {
    if (categories.length === 0) return;

    setOpenGroups((prev) => {
      const next = { ...prev };
      for (const group of categories) {
        if (typeof next[group.id] === "undefined") {
          next[group.id] = !!group.default_open;
        }
      }
      return next;
    });

    setOpenCategories((prev) => {
      const next = { ...prev };
      for (const group of categories) {
        for (const item of group.items) {
          if (typeof next[item.id] === "undefined") {
            next[item.id] = item.id === activeCategoryId;
          }
        }
      }
      return next;
    });
  }, [categories, activeCategoryId]);

  useEffect(() => {
    if (!activeCategoryId) return;
    setOpenCategories((prev) => ({ ...prev, [activeCategoryId]: true }));
  }, [activeCategoryId]);

  const toggleGroup = (groupId: string): void => {
    setOpenGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  const toggleCategory = (categoryId: string): void => {
    setOpenCategories((prev) => ({ ...prev, [categoryId]: !prev[categoryId] }));
    onSelectCategory(categoryId);
  };

  return (
    <aside className="editor-sidebar" aria-label="카테고리 및 글 목록">
      <div className="editor-sidebar__header">
        <h1>Workspace</h1>
        <button type="button" className="btn btn--solid" onClick={onCreateDraft}>
          + New
        </button>
      </div>

      <div className="editor-sidebar__search">
        <input
          type="search"
          placeholder="Search notes"
          value={searchQuery}
          onChange={(event) => onSearchQuery(event.target.value)}
        />
      </div>

      {isSearching ? (
        <section className="search-results" aria-label="검색 결과">
          <header className="search-results__header">
            <span>Search Results</span>
            <strong>{visiblePosts.length}</strong>
          </header>
          <ul className="search-results__list">
            {visiblePosts.map((post) => (
              <li key={post.filePath}>
                <button
                  type="button"
                  className={`search-post ${selectedFilePath === post.filePath ? "is-active" : ""}`}
                  onClick={() => {
                    onSelectCategory(post.categories[0] ?? activeCategoryId);
                    onSelectPost(post.filePath);
                  }}
                >
                  <span className="search-post__title">{post.title}</span>
                  <span className="search-post__meta">
                    {(post.categories[0] ?? "-").toUpperCase()} · {post.date}
                  </span>
                </button>
              </li>
            ))}
            {visiblePosts.length === 0 && <li className="tree-empty">검색 결과가 없습니다.</li>}
          </ul>
        </section>
      ) : (
        <nav className="editor-tree" aria-label="카테고리 트리">
          {categories.map((group) => {
            const isGroupOpen = openGroups[group.id] ?? false;

            return (
              <section key={group.id} className="tree-group">
                <button type="button" className="tree-group__btn" onClick={() => toggleGroup(group.id)}>
                  <span className={`tree-arrow ${isGroupOpen ? "is-open" : ""}`}>▾</span>
                  <span className="tree-group__label">{group.label}</span>
                </button>

                {isGroupOpen && (
                  <ul className="tree-categories">
                    {group.items.map((item) => {
                      const isCategoryOpen = openCategories[item.id] ?? false;
                      const categoryPosts = postsByCategory.get(item.id) ?? [];

                      return (
                        <li key={item.id}>
                          <button
                            type="button"
                            className={`tree-category ${activeCategoryId === item.id ? "is-active" : ""}`}
                            onClick={() => toggleCategory(item.id)}
                          >
                            <span className={`tree-arrow tree-arrow--small ${isCategoryOpen ? "is-open" : ""}`}>▾</span>
                            <span className="tree-category__label">{item.label}</span>
                            <span className="tree-category__count">{categoryPosts.length}</span>
                          </button>

                          {isCategoryOpen && (
                            <ul className="tree-posts">
                              {categoryPosts.map((post) => (
                                <li key={post.filePath}>
                                  <button
                                    type="button"
                                    className={`tree-post ${selectedFilePath === post.filePath ? "is-active" : ""}`}
                                    onClick={() => onSelectPost(post.filePath)}
                                  >
                                    <span className="tree-post__dot">•</span>
                                    <span className="tree-post__title">{post.title}</span>
                                    <span className="tree-post__date">{post.date.slice(5)}</span>
                                  </button>
                                </li>
                              ))}
                              {categoryPosts.length === 0 && <li className="tree-empty">No posts</li>}
                            </ul>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            );
          })}
        </nav>
      )}

      <div className="editor-sidebar__footer">
        <button type="button" className="btn editor-sidebar__manage-btn" onClick={onOpenCategoryManager}>
          카테고리 관리
        </button>
      </div>
    </aside>
  );
}
