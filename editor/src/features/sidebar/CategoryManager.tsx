import { useEffect, useMemo, useState } from "react";
import type {
  CategoryCreateInput,
  CategoryDeleteInput,
  CategoryGroup,
  CategoryUpdateInput
} from "../../../shared/types";

interface CategoryManagerProps {
  categories: CategoryGroup[];
  postCounts: Record<string, number>;
  activeCategoryId: string;
  busy: boolean;
  onClose: () => void;
  onCreateCategory: (input: CategoryCreateInput) => Promise<void>;
  onUpdateCategory: (input: CategoryUpdateInput) => Promise<void>;
  onDeleteCategory: (input: CategoryDeleteInput) => Promise<void>;
}

export default function CategoryManager({
  categories,
  postCounts,
  activeCategoryId,
  busy,
  onClose,
  onCreateCategory,
  onUpdateCategory,
  onDeleteCategory
}: CategoryManagerProps) {
  const flatItems = useMemo(
    () =>
      categories.flatMap((group) =>
        group.items.map((item) => ({
          groupId: group.id,
          groupLabel: group.label,
          id: item.id,
          label: item.label
        }))
      ),
    [categories]
  );

  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(activeCategoryId);
  const [createGroupId, setCreateGroupId] = useState<string>(categories[0]?.id ?? "");
  const [createLabel, setCreateLabel] = useState<string>("");
  const [createId, setCreateId] = useState<string>("");
  const [editLabel, setEditLabel] = useState<string>("");
  const [editId, setEditId] = useState<string>("");

  useEffect(() => {
    setSelectedCategoryId((current) => {
      if (activeCategoryId && flatItems.some((item) => item.id === activeCategoryId)) {
        return activeCategoryId;
      }
      if (current && flatItems.some((item) => item.id === current)) {
        return current;
      }
      return flatItems[0]?.id ?? "";
    });
  }, [activeCategoryId, flatItems]);

  useEffect(() => {
    if (!categories.find((group) => group.id === createGroupId)) {
      setCreateGroupId(categories[0]?.id ?? "");
    }
  }, [categories, createGroupId]);

  const selectedCategory = flatItems.find((item) => item.id === selectedCategoryId) ?? null;
  const selectedCount = selectedCategory ? postCounts[selectedCategory.id] ?? 0 : 0;

  useEffect(() => {
    if (!selectedCategory) {
      setEditLabel("");
      setEditId("");
      return;
    }

    setEditLabel(selectedCategory.label);
    setEditId(selectedCategory.id);
  }, [selectedCategory?.id, selectedCategory?.label]);

  return (
    <div className="category-manager" role="dialog" aria-modal="true" aria-label="카테고리 관리">
      <div className="category-manager__header">
        <div>
          <h2>카테고리 관리</h2>
          <p>삭제는 연결된 글이 없을 때만 가능합니다.</p>
        </div>
        <button type="button" className="btn" onClick={onClose}>
          닫기
        </button>
      </div>

      <div className="category-manager__grid">
        <section className="category-manager__list">
          {categories.map((group) => (
            <div key={group.id} className="category-manager__group">
              <p className="category-manager__group-label">{group.label}</p>
              <ul>
                {group.items.map((item) => {
                  const count = postCounts[item.id] ?? 0;
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        className={`category-manager__item ${selectedCategoryId === item.id ? "is-active" : ""}`}
                        onClick={() => setSelectedCategoryId(item.id)}
                      >
                        <span>{item.label}</span>
                        <small>
                          {item.id} · 글 {count}
                        </small>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </section>

        <section className="category-manager__forms">
          <form
            className="category-manager__panel"
            onSubmit={(event) => {
              event.preventDefault();
              void onCreateCategory({
                groupId: createGroupId,
                id: createId,
                label: createLabel
              }).then(() => {
                setCreateLabel("");
                setCreateId("");
              });
            }}
          >
            <h3>새 카테고리 추가</h3>
            <label>
              그룹
              <select value={createGroupId} onChange={(event) => setCreateGroupId(event.target.value)}>
                {categories.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              표시 이름
              <input value={createLabel} onChange={(event) => setCreateLabel(event.target.value)} placeholder="예: 독서노트" />
            </label>
            <label>
              카테고리 ID
              <input value={createId} onChange={(event) => setCreateId(event.target.value)} placeholder="예: reading-note" />
            </label>
            <p className="muted">ID는 영문 소문자, 숫자, `-`, `_`만 유지됩니다.</p>
            <button type="submit" className="btn btn--solid" disabled={busy}>
              추가
            </button>
          </form>

          <form
            className="category-manager__panel"
            onSubmit={(event) => {
              event.preventDefault();
              if (!selectedCategory) return;
              void onUpdateCategory({
                groupId: selectedCategory.groupId,
                categoryId: selectedCategory.id,
                nextId: editId,
                nextLabel: editLabel
              });
            }}
          >
            <h3>선택 카테고리 수정</h3>
            {selectedCategory ? (
              <>
                <label>
                  그룹
                  <input value={selectedCategory.groupLabel} readOnly />
                </label>
                <label>
                  표시 이름
                  <input value={editLabel} onChange={(event) => setEditLabel(event.target.value)} />
                </label>
                <label>
                  카테고리 ID
                  <input value={editId} onChange={(event) => setEditId(event.target.value)} />
                </label>
                <p className="muted">이 카테고리를 쓰는 글: {selectedCount}개</p>
                <div className="category-manager__actions">
                  <button type="submit" className="btn btn--solid" disabled={busy}>
                    저장
                  </button>
                  <button
                    type="button"
                    className="btn"
                    disabled={busy || selectedCount > 0}
                    onClick={() => {
                      if (!selectedCategory) return;
                      const okay = window.confirm(`카테고리 "${selectedCategory.label}" 를 삭제하시겠습니까?`);
                      if (!okay) return;
                      void onDeleteCategory({
                        groupId: selectedCategory.groupId,
                        categoryId: selectedCategory.id
                      });
                    }}
                  >
                    삭제
                  </button>
                </div>
                {selectedCount > 0 && <p className="warning">연결된 글이 있어 삭제할 수 없습니다.</p>}
              </>
            ) : (
              <p className="muted">수정할 카테고리를 왼쪽 목록에서 선택하세요.</p>
            )}
          </form>
        </section>
      </div>
    </div>
  );
}
