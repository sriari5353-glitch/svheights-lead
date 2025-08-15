import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusIcon, Users, BookOpen, CheckSquare } from "lucide-react";
import { CRMProvider } from "@/context/CRMContext";
import TaskManager from "@/components/TaskManager";
import Leads from "@/components/Leads";
import Diary from "@/components/Diary";

const Index = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("dashboard");

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Welcome to CRM</CardTitle>
            <CardDescription>Please sign in to continue</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <CRMProvider>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="container mx-auto p-4">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Welcome back, {user.email}
            </h1>
            <p className="text-gray-600">Manage your business relationships and tasks</p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="dashboard" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Dashboard
              </TabsTrigger>
              <TabsTrigger value="leads" className="flex items-center gap-2">
                <PlusIcon className="h-4 w-4" />
                Leads
              </TabsTrigger>
              <TabsTrigger value="tasks" className="flex items-center gap-2">
                <CheckSquare className="h-4 w-4" />
                Tasks
              </TabsTrigger>
              <TabsTrigger value="diary" className="flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                Diary
              </TabsTrigger>
            </TabsList>

            <TabsContent value="dashboard">
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Quick Actions
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Button 
                      onClick={() => setActiveTab("leads")} 
                      className="w-full justify-start"
                      variant="outline"
                    >
                      <PlusIcon className="mr-2 h-4 w-4" />
                      Add New Lead
                    </Button>
                    <Button 
                      onClick={() => setActiveTab("tasks")} 
                      className="w-full justify-start"
                      variant="outline"
                    >
                      <CheckSquare className="mr-2 h-4 w-4" />
                      Manage Tasks
                    </Button>
                    <Button 
                      onClick={() => setActiveTab("diary")} 
                      className="w-full justify-start"
                      variant="outline"
                    >
                      <BookOpen className="mr-2 h-4 w-4" />
                      Daily Notes
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Total Leads</CardTitle>
                    <CardDescription>All leads in your system</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">150</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Open Tasks</CardTitle>
                    <CardDescription>Tasks that need to be completed</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">25</p>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="leads">
              <Leads />
            </TabsContent>

            <TabsContent value="tasks">
              <TaskManager />
            </TabsContent>

            <TabsContent value="diary">
              <Diary />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </CRMProvider>
  );
};

export default Index;
