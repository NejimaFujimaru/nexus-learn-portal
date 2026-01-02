import { Calendar, Clock, BookOpen, FileText } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Test } from '@/lib/firebase';
import { useNavigate } from 'react-router-dom';

interface TestCardProps {
  test: Test;
  showAction?: boolean;
}

export const TestCard = ({ test, showAction = true }: TestCardProps) => {
  const navigate = useNavigate();

  const statusColors: Record<string, string> = {
    upcoming: 'bg-accent text-accent-foreground',
    completed: 'bg-primary/10 text-primary',
    'in-progress': 'bg-chart-2/20 text-chart-2',
    'pending-review': 'bg-chart-5/20 text-chart-5',
    published: 'bg-primary/10 text-primary',
    draft: 'bg-muted text-muted-foreground',
  };

  const typeColors: Record<string, string> = {
    Quiz: 'bg-chart-1/20 text-chart-1',
    quiz: 'bg-chart-1/20 text-chart-1',
    'Mid-Term': 'bg-chart-3/20 text-chart-3',
    midterm: 'bg-chart-3/20 text-chart-3',
    Final: 'bg-destructive/10 text-destructive',
    final: 'bg-destructive/10 text-destructive',
    Practice: 'bg-chart-4/20 text-chart-4',
    practice: 'bg-chart-4/20 text-chart-4',
  };

  const status = test.status || 'upcoming';
  const type = test.type || 'Quiz';

  return (
    <Card className="hover:shadow-lg transition-shadow duration-300 bg-card">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start gap-2">
          <h3 className="font-semibold text-lg text-card-foreground line-clamp-2">{test.title}</h3>
          <Badge className={statusColors[status] || statusColors.upcoming} variant="secondary">
            {status.replace('-', ' ')}
          </Badge>
        </div>
        <div className="flex gap-2 mt-2">
          <Badge className={typeColors[type] || typeColors.Quiz} variant="outline">
            {type}
          </Badge>
          <Badge variant="outline">{test.subjectName || test.subjectId}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>{new Date(test.createdAt).toLocaleDateString('en-US', { 
            weekday: 'short', 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
          })}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>{test.duration} minutes</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <FileText className="h-4 w-4" />
          <span>{test.totalMarks} marks</span>
        </div>
        {test.chapterIds && test.chapterIds.length > 0 && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <BookOpen className="h-4 w-4" />
            <span className="line-clamp-1">{test.chapterIds.join(', ')}</span>
          </div>
        )}
      </CardContent>
      {showAction && (
        <CardFooter>
          {status === 'upcoming' || status === 'published' ? (
            <Button 
              className="w-full" 
              onClick={() => navigate(`/student/test/${test.id}/details`)}
            >
              View Details
            </Button>
          ) : status === 'completed' ? (
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => navigate(`/student/test/${test.id}/result`)}
            >
              View Result
            </Button>
          ) : (
            <Button variant="secondary" className="w-full" disabled>
              {status === 'pending-review' ? 'Awaiting Review' : 'In Progress'}
            </Button>
          )}
        </CardFooter>
      )}
    </Card>
  );
};
