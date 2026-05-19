import { useNavigate } from 'react-router-dom';
import { Sparkles, ArrowRight, Play, FileText, Zap, LayoutGrid } from 'lucide-react';

export default function Home() {
  const navigate = useNavigate();

  const quickActions = [
    {
      icon: FileText,
      title: 'New Project',
      desc: 'Start building a new website from scratch',
      action: () => navigate('/builder'),
    },
    {
      icon: LayoutGrid,
      title: 'Browse Templates',
      desc: 'Choose from professionally designed templates',
      action: () => navigate('/templates'),
    },
    {
      icon: Zap,
      title: 'Learn More',
      desc: 'Explore features and documentation',
      action: () => navigate('/docs'),
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-gray-50">
      {/* Main Content */}
      <div className="flex flex-col items-center justify-center min-h-screen px-4 py-12">
        <div className="max-w-3xl mx-auto text-center space-y-8">
          {/* Header */}
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-md border border-[#6366F1]/20 bg-[#6366F1]/10 px-3 py-1.5 mb-4">
              <Sparkles className="w-3.5 h-3.5 text-[#6366F1]" />
              <span className="text-xs text-[#C7D2FE] font-medium">Welcome back to Joyful</span>
            </div>
            
            <h1 className="text-5xl sm:text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-indigo-300 tracking-tight leading-tight">
              Create Beautiful Websites
            </h1>
            
            <p className="text-lg text-[#B7B7C8] max-w-2xl mx-auto leading-relaxed">
              Build stunning, professional websites with local AI assistance, live preview, and instant deployment. No credit card required.
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center justify-center pt-4">
            <button
              onClick={() => navigate('/builder')}
              className="flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-indigo-600 to-indigo-500 px-8 py-3.5 font-semibold text-white transition-all hover:shadow-lg hover:shadow-[#6366F1]/40 hover:-translate-y-0.5"
            >
              <span>Start Building</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button className="flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-8 py-3.5 font-semibold text-gray-900 transition-all hover:border-gray-400 hover:bg-gray-50">
              <Play className="w-4 h-4" />
              <span>Watch Demo</span>
            </button>
          </div>

          {/* Quick Actions Grid */}
          <div className="pt-12">
            <p className="text-sm text-gray-600 mb-6 font-medium">Quick Actions</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {quickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.title}
                    onClick={action.action}
                    className="group flex flex-col items-start justify-between rounded-lg border border-gray-300 bg-white p-6 transition-all hover:border-gray-400 hover:bg-gray-50 hover:shadow-lg hover:shadow-[#6366F1]/10"
                  >
                    <div className="w-10 h-10 rounded-lg bg-[#6366F1]/10 flex items-center justify-center mb-3 group-hover:bg-[#6366F1]/20 transition-colors">
                      <Icon className="w-5 h-5 text-[#6366F1]" />
                    </div>
                    <div className="text-left">
                      <h3 className="text-sm font-semibold text-gray-900 mb-1 group-hover:text-[#6366F1] transition-colors">
                        {action.title}
                      </h3>
                      <p className="text-xs text-gray-600">{action.desc}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-[#6366F1] opacity-0 group-hover:opacity-100 transition-opacity mt-4" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Stats Section */}
          <div className="pt-12 grid grid-cols-3 gap-8 max-w-md mx-auto">
            {[
              { label: 'Projects', value: '100%' },
              { label: 'Local Storage', value: 'Free' },
              { label: 'Export Ready', value: 'Always' },
            ].map((stat) => (
              <div key={stat.label} className="space-y-1">
                <div className="text-2xl font-bold text-[#6366F1]">{stat.value}</div>
                <div className="text-xs text-gray-600">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Decorative elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/3 -left-40 w-80 h-80 bg-[#6366F1]/10 rounded-full blur-3xl opacity-30" />
        <div className="absolute bottom-1/3 -right-40 w-80 h-80 bg-[#6366F1]/10 rounded-full blur-3xl opacity-30" />
      </div>
    </div>
  );
}
