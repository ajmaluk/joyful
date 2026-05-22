import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { routeMeta } from '@/lib/seo';
import { Sparkles, ArrowRight, Play, FileText, Zap, LayoutGrid, CreditCard, Mail } from 'lucide-react';

export default function Home() {
  const navigate = useNavigate();
  const meta = routeMeta['/'];

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
      icon: CreditCard,
      title: 'Pricing',
      desc: 'See the plan details and compare options',
      action: () => navigate('/pricing'),
    },
    {
      icon: Mail,
      title: 'Contact Form',
      desc: 'Open the contact experience and messaging flow',
      action: () => navigate('/contact'),
    },
    {
      icon: Zap,
      title: 'Learn More',
      desc: 'Explore features and documentation',
      action: () => navigate('/docs'),
    },
  ];

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#ffffff_0%,#e8ecff_20%,#d4dcff_38%,#f0e0ff_56%,#ffe0ec_72%,#fff0e0_100%)] text-gray-950 dark:bg-[linear-gradient(180deg,#0a0a0a_0%,#161719_20%,#21365f_38%,#3a2040_56%,#4a1030_72%,#4a2010_100%)] dark:text-[#f6f2ea]">
      <Helmet>
        <title>{meta.title}</title>
        <meta name="description" content={meta.description} />
        <link rel="canonical" href={meta.canonical} />
        <meta property="og:title" content={meta.title} />
        <meta property="og:url" content={meta.canonical} />
        <meta property="og:description" content={meta.description} />
        <meta name="twitter:title" content={meta.title} />
        <meta name="twitter:description" content={meta.description} />
      </Helmet>
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
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
              {quickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.title}
                    onClick={action.action}
                    className="group flex min-h-40 flex-col items-start justify-between rounded-2xl border border-gray-200 bg-white p-6 text-left transition-all hover:-translate-y-0.5 hover:border-[#6366F1]/35 hover:bg-gray-50 hover:shadow-lg hover:shadow-[#6366F1]/10"
                  >
                    <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-[#6366F1]/10 text-[#6366F1] transition-colors group-hover:bg-[#6366F1]/15">
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
              { label: 'Templates', value: '8+' },
              { label: 'Export Formats', value: '3' },
              { label: 'Cost', value: '$0' },
            ].map((stat) => (
              <div key={stat.label} className="space-y-1">
                <div className="text-2xl font-bold text-[#6366F1]">{stat.value}</div>
                <div className="text-xs text-gray-600">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>


    </div>
  );
}
