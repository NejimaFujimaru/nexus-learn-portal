import React from 'react';
import { Progress } from '@/components/ui/progress';

interface GradingAnimationProps {
  stage: string;
  progress: number;
}

// Diamond star component (same as AI Question Generator)
const DiamondStar: React.FC<{ className?: string; style?: React.CSSProperties }> = ({ className, style }) => (
  <svg 
    viewBox="0 0 24 24" 
    className={className}
    style={style}
    fill="currentColor"
  >
    <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
  </svg>
);

// Galaxy animation (same as AI Question Generator)
const GalaxyAnimation: React.FC = () => (
  <div className="relative w-48 h-48 mx-auto">
    {/* Outer glow */}
    <div className="absolute inset-0 rounded-full bg-gradient-to-r from-primary/30 via-accent/30 to-secondary/30 blur-xl animate-pulse" />
    
    {/* Rotating ring */}
    <div className="absolute inset-4 rounded-full border-2 border-primary/40 animate-spin" style={{ animationDuration: '8s' }} />
    <div className="absolute inset-8 rounded-full border border-accent/30 animate-spin" style={{ animationDuration: '6s', animationDirection: 'reverse' }} />
    <div className="absolute inset-12 rounded-full border border-secondary/20 animate-spin" style={{ animationDuration: '4s' }} />
    
    {/* Center glow */}
    <div className="absolute inset-16 rounded-full bg-gradient-to-br from-primary via-accent to-secondary animate-pulse blur-sm" />
    <div className="absolute inset-[4.5rem] rounded-full bg-background/80 backdrop-blur-sm" />
    
    {/* Floating stars */}
    {[...Array(8)].map((_, i) => (
      <DiamondStar
        key={i}
        className="absolute w-3 h-3 text-primary/80 animate-pulse"
        style={{
          top: `${20 + Math.sin(i * 0.8) * 35}%`,
          left: `${20 + Math.cos(i * 0.8) * 35}%`,
          animationDelay: `${i * 0.2}s`,
          animationDuration: `${1.5 + (i % 3) * 0.5}s`
        }}
      />
    ))}
    
    {/* Center icon */}
    <div className="absolute inset-0 flex items-center justify-center">
      <DiamondStar className="w-6 h-6 text-primary animate-pulse" />
    </div>
  </div>
);

// Completion animation
const CompletionAnimation: React.FC<{ score: number; maxScore: number }> = ({ score, maxScore }) => {
  const percentage = Math.round((score / maxScore) * 100);
  
  return (
    <div className="text-center space-y-6">
      <div className="relative w-32 h-32 mx-auto">
        {/* Success glow */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-primary/30 via-accent/30 to-secondary/30 blur-xl animate-pulse" />
        
        {/* Circle */}
        <div className="absolute inset-0 rounded-full border-4 border-primary/50" />
        <div className="absolute inset-2 rounded-full bg-gradient-to-br from-primary/20 to-accent/20" />
        
        {/* Score */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold text-foreground">{percentage}%</span>
          <span className="text-sm text-muted-foreground">{score}/{maxScore}</span>
        </div>
      </div>
      
      {/* Stars */}
      <div className="flex justify-center gap-2">
        {[...Array(5)].map((_, i) => (
          <DiamondStar
            key={i}
            className={`w-6 h-6 transition-all duration-500 ${
              i < Math.ceil(percentage / 20) 
                ? 'text-primary scale-100' 
                : 'text-muted/30 scale-75'
            }`}
            style={{ animationDelay: `${i * 0.1}s` }}
          />
        ))}
      </div>
      
      <p className="text-lg font-medium text-foreground">
        {percentage >= 80 ? 'Excellent work!' : 
         percentage >= 60 ? 'Good job!' : 
         percentage >= 40 ? 'Keep practicing!' : 
         'Don\'t give up!'}
      </p>
    </div>
  );
};

export const GradingAnimation: React.FC<GradingAnimationProps> = ({ stage, progress }) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 space-y-8">
      <GalaxyAnimation />
      
      <div className="w-full max-w-md space-y-4">
        <div className="text-center">
          <h3 className="text-xl font-semibold text-foreground">
            Grading Your Practice Test
          </h3>
          <p className="text-muted-foreground animate-pulse">
            {stage}
          </p>
        </div>
        
        <Progress value={progress} className="h-2" />
        
        <p className="text-center text-sm text-muted-foreground">
          {progress}% complete
        </p>
      </div>
    </div>
  );
};

export const GradingComplete: React.FC<{ 
  score: number; 
  maxScore: number;
  onViewResults: () => void;
}> = ({ score, maxScore, onViewResults }) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 space-y-8">
      <CompletionAnimation score={score} maxScore={maxScore} />
      
      <button
        onClick={onViewResults}
        className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
      >
        View Detailed Results
      </button>
    </div>
  );
};

export default GradingAnimation;
