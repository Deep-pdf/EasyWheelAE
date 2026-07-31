import React from 'react';

interface CategorySidebarProps {
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
}

const CATEGORIES = [
  'All',
  'Favorites',
  'Layer',
  'Animation',
  'Composition',
  'Timeline',
  'Effects',
  'Masks',
  'Shapes',
  'View',
  'Panels',
  'Utilities'
];

export const CategorySidebar: React.FC<CategorySidebarProps> = ({
  selectedCategory,
  onSelectCategory
}) => {
  return (
    <div className="category-sidebar">
      <div className="category-sidebar-title">Categories</div>
      <ul className="category-list">
        {CATEGORIES.map(category => (
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
