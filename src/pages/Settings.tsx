import { Link } from 'react-router-dom';
import { ArrowLeft, User, Settings as SettingsIcon, Shield, Moon, Sun, Bell, Globe, Lock, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useAuth } from '@/hooks/useAuth';
import { useState } from 'react';

const Settings = () => {
  const { user, role } = useAuth();
  const userName = user?.displayName || user?.email?.split('@')[0] || 'User';
  const userEmail = user?.email || '';
  const userInitials = userName.slice(0, 2).toUpperCase();

  const [theme, setTheme] = useState('system');
  const [language, setLanguage] = useState('en');
  const [notifications, setNotifications] = useState(true);

  const backPath = role === 'teacher' ? '/teacher/dashboard' : '/student/dashboard';

  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        {/* Left Sidebar */}
        <aside className="w-64 min-h-screen border-r border-border bg-card p-6 hidden md:block">
          <Link 
            to={backPath}
            className="inline-flex items-center text-muted-foreground hover:text-primary mb-8 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Link>

          <h2 className="text-lg font-semibold text-foreground mb-6">Settings</h2>
          
          <nav className="space-y-2">
            <a href="#profile" className="flex items-center gap-3 px-3 py-2 rounded-lg bg-primary/10 text-primary font-medium">
              <User className="h-4 w-4" />
              Profile
            </a>
            <a href="#preferences" className="flex items-center gap-3 px-3 py-2 rounded-lg text-muted-foreground hover:bg-accent transition-colors">
              <SettingsIcon className="h-4 w-4" />
              Preferences
            </a>
            <a href="#account" className="flex items-center gap-3 px-3 py-2 rounded-lg text-muted-foreground hover:bg-accent transition-colors">
              <Shield className="h-4 w-4" />
              Account
            </a>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6 md:p-8 max-w-3xl">
          {/* Mobile Back Button */}
          <Link 
            to={backPath}
            className="inline-flex items-center text-muted-foreground hover:text-primary mb-6 transition-colors md:hidden"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Link>

          <h1 className="text-2xl font-bold text-foreground mb-8">Settings</h1>

          {/* Profile Section */}
          <Card id="profile" className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Profile
              </CardTitle>
              <CardDescription>Manage your profile information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Avatar */}
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarFallback className="bg-primary/10 text-primary text-lg">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm text-muted-foreground">Profile Picture</p>
                  <Button variant="outline" size="sm" disabled className="mt-1">
                    Upload Photo (Coming Soon)
                  </Button>
                </div>
              </div>

              <Separator />

              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="name">Display Name</Label>
                <div className="flex gap-2">
                  <Input id="name" value={userName} disabled className="flex-1" />
                  <Button variant="outline" disabled>Edit</Button>
                </div>
                <p className="text-xs text-muted-foreground">Name editing coming soon</p>
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" value={userEmail} disabled />
              </div>

              {/* Role */}
              <div className="space-y-2">
                <Label>Role</Label>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium capitalize">
                    {role || 'User'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Preferences Section */}
          <Card id="preferences" className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <SettingsIcon className="h-5 w-5" />
                Preferences
              </CardTitle>
              <CardDescription>Customize your experience</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Theme */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {theme === 'dark' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
                  <div>
                    <Label>Theme</Label>
                    <p className="text-sm text-muted-foreground">Select your preferred theme</p>
                  </div>
                </div>
                <Select value={theme} onValueChange={setTheme}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                    <SelectItem value="system">System</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              {/* Language */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Globe className="h-5 w-5" />
                  <div>
                    <Label>Language</Label>
                    <p className="text-sm text-muted-foreground">Choose your language</p>
                  </div>
                </div>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="es">Spanish</SelectItem>
                    <SelectItem value="fr">French</SelectItem>
                    <SelectItem value="de">German</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              {/* Notifications */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Bell className="h-5 w-5" />
                  <div>
                    <Label>Notifications</Label>
                    <p className="text-sm text-muted-foreground">Enable or disable notifications</p>
                  </div>
                </div>
                <Switch checked={notifications} onCheckedChange={setNotifications} />
              </div>
            </CardContent>
          </Card>

          {/* Account Section */}
          <Card id="account">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Account
              </CardTitle>
              <CardDescription>Manage your account settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Change Password */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Lock className="h-5 w-5" />
                  <div>
                    <Label>Change Password</Label>
                    <p className="text-sm text-muted-foreground">Update your password</p>
                  </div>
                </div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" disabled>
                      Change Password
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Coming soon</p>
                  </TooltipContent>
                </Tooltip>
              </div>

              <Separator />

              {/* Delete Account Warning */}
              <div className="flex items-start gap-3 p-4 bg-destructive/10 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
                <div>
                  <p className="font-medium text-destructive">Danger Zone</p>
                  <p className="text-sm text-muted-foreground">
                    Account deletion is permanent and cannot be undone. All your data, including tests and submissions, will be permanently removed.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
};

export default Settings;