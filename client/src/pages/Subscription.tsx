import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink, Plus, Minus } from "lucide-react";

export default function Subscription() {
  const { user } = useAuth();
  const [creditAmount, setCreditAmount] = useState(1);
  
  const getUserInitial = () => {
    if (!user?.name) return "U";
    return user.name.charAt(0).toUpperCase();
  };
  
  const incrementCredits = () => {
    setCreditAmount(prev => Math.min(prev + 1, 10));
  };
  
  const decrementCredits = () => {
    setCreditAmount(prev => Math.max(prev - 1, 1));
  };
  
  const creditPrice = 3.00;
  const totalPrice = (creditAmount * 100 * creditPrice).toFixed(2);

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-5xl py-12">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-foreground mb-2">My Subscription</h1>
          <p className="text-muted-foreground">Manage your subscription and billing information.</p>
        </div>

        {/* Account Section */}
        <div className="mb-12">
          <h2 className="text-2xl font-semibold text-foreground mb-6">Account</h2>
          <Card className="p-6 border-border/40 bg-card/50">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-semibold text-lg">
                {getUserInitial()}
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">Email Address</div>
                <div className="text-foreground font-medium">{user?.email || "Not logged in"}</div>
              </div>
            </div>
          </Card>
        </div>

        {/* Current Plan Section */}
        <div className="mb-12">
          <h2 className="text-2xl font-semibold text-foreground mb-2">Current Plan</h2>
          <p className="text-muted-foreground mb-6">Manage your current plan and billing information.</p>
          
          <div className="grid md:grid-cols-2 gap-6">
            {/* Plan Card */}
            <Card className="p-6 border-border/40 bg-card/50">
              <div className="text-sm text-muted-foreground mb-2">Plan</div>
              <div className="text-2xl font-semibold text-foreground">Free Plan</div>
            </Card>
            
            {/* Billing Details Card */}
            <Card className="p-6 border-border/40 bg-card/50">
              <div className="text-sm text-muted-foreground mb-4">Billing Details</div>
              <Button variant="outline" className="w-full sm:w-auto">
                <span>Manage Your Billing Details</span>
                <ExternalLink className="ml-2 h-4 w-4" />
              </Button>
            </Card>
          </div>
        </div>

        {/* Usage Section */}
        <div>
          <h2 className="text-2xl font-semibold text-foreground mb-2">Usage</h2>
          <p className="text-muted-foreground mb-6">Manage your usage</p>
          
          <div className="grid md:grid-cols-2 gap-6">
            {/* Credits Card */}
            <Card className="p-6 border-border/40 bg-card/50">
              <div className="text-sm text-muted-foreground mb-2">Credits</div>
              <div className="text-3xl font-semibold text-foreground">10 Credits</div>
            </Card>
            
            {/* Load Credits Card */}
            <Card className="p-6 border-border/40 bg-card/50">
              <div className="text-sm text-muted-foreground mb-6">Load up with a credit pack</div>
              
              {/* Credit Amount Selector */}
              <div className="flex items-center justify-center gap-6 mb-4">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={decrementCredits}
                  disabled={creditAmount <= 1}
                  className="h-10 w-10 rounded-full"
                >
                  <Minus className="h-5 w-5" />
                </Button>
                
                <div className="text-center min-w-[120px]">
                  <div className="text-2xl font-semibold text-foreground mb-1">
                    {creditAmount}
                  </div>
                </div>
                
                <Button
                  variant="outline"
                  size="icon"
                  onClick={incrementCredits}
                  disabled={creditAmount >= 10}
                  className="h-10 w-10 rounded-full"
                >
                  <Plus className="h-5 w-5" />
                </Button>
              </div>
              
              <div className="text-center text-sm text-muted-foreground mb-6">
                {creditAmount * 100} Credits For ~${totalPrice}
              </div>
              
              {/* Upgrade Button */}
              <Button 
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold py-6 text-lg"
              >
                Upgrade Plan
              </Button>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

