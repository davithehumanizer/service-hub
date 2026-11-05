import React from 'react';

interface DifficultyRatingProps {
  difficulty: string;
}

const DifficultyRating: React.FC<DifficultyRatingProps> = ({ difficulty }) => {
  const getRating = () => {
    switch (difficulty?.toLowerCase()) {
      case 'easy':
        return 1;
      case 'moderate':
        return 2;
      case 'hard':
      case 'difficult':
      case 'very hard':
        return 3;
      default:
        return 0;
    }
  };

  const rating = getRating();

  return (
    <div className="flex items-center">
      {[...Array(3)].map((_, index) => (
        <span
          key={index}
          className={`material-symbols-outlined text-2xl ${ 
            index < rating ? 'text-yellow-400' : 'text-gray-300'
          }`}>
            star
        </span>
      ))}
    </div>
  );
};

export default DifficultyRating;