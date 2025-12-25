import { Header } from '@/components/layout/Header';
import { TestCard } from '@/components/TestCard';
import { mockTests } from '@/data/mockData';
import { BookOpen, CheckCircle, Clock, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const StudentDashboard = () => {
  const upcomingTests = mockTests.filter((t) => t.status === 'upcoming');
  const pastTests = mockTests.filter((t) => t.status === 'completed' || t.status === 'pending-review');

  const stats = [
    { icon: BookOpen, label: 'Total Tests', value: mockTests.length, color: 'text-primary' },
    { icon: CheckCircle, label: 'Completed', value: pastTests.length, color: 'text-chart-1' },
    { icon: Clock, label: 'Upcoming', value: upcomingTests.length, color: 'text-chart-3' },
    { icon: TrendingUp, label: 'Avg. Score', value: '82%', color: 'text-chart-4' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header userType="student" userName="Alex Thompson" />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Welcome back, Alex!</h1>
          <p className="text-muted-foreground">Here's an overview of your learning progress.</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {stats.map((stat, index) => (
            <Card key={index} className="bg-card">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg bg-primary/10`}>
                    <stat.icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-card-foreground">{stat.value}</p>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tests Tabs */}
        <Tabs defaultValue="upcoming" className="space-y-6">
          <TabsList className="bg-muted">
            <TabsTrigger value="upcoming" className="data-[state=active]:bg-card">
              Upcoming Tests ({upcomingTests.length})
            </TabsTrigger>
            <TabsTrigger value="past" className="data-[state=active]:bg-card">
              Past Tests ({pastTests.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="space-y-6">
            {upcomingTests.length > 0 ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {upcomingTests.map((test) => (
                  <TestCard key={test.id} test={test} />
                ))}
              </div>
            ) : (
              <Card className="bg-card">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Clock className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No upcoming tests scheduled.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="past" className="space-y-6">
            {pastTests.length > 0 ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {pastTests.map((test) => (
                  <TestCard key={test.id} test={test} />
                ))}
              </div>
            ) : (
              <Card className="bg-card">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <CheckCircle className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No completed tests yet.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default StudentDashboard;
