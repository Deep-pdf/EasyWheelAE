import React from 'react';

interface CategorySidebarProps {
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
  categories: string[];
}

export const CategorySidebar: React.FC<CategorySidebarProps> = ({
  selectedCategory,
  onSelectCategory,
  categories
}) => {
  return (
    <div className="category-sidebar">
      <div className="category-sidebar-title">Categories</div>
      <ul className="category-list">
        {categories.map(category => (
          <li key={category} className="category-list-item">
            <button
              type="button"
              className={`category-item-btn ${selectedCategory === category ? 'active' : ''}`}
              onClick={() => onSelectCategory(category)}
            >
              <span className="category-name">{category}</span>
              {category === 'Favorites' && <span className="fav-icon">★</span>}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};
