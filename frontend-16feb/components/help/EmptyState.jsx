import React from 'react';
import { FileText, Shield, CheckSquare, ListTodo, FileCheck, Clock, Plus, ArrowRight } from 'lucide-react';

const EmptyState = ({
  type = 'default',
  title = '',
  description = '',
  actionLabel = 'Get Started',
  onAction = () => {},
  showQuickStart = true,
  className = ''
}) => {
  const resolvedTitle = title;
  const resolvedDescription = description;
  const states = {
    evidence: {
      icon: FileText,
      title: 'No Evidence Collections Yet',
      description: 'Start collecting compliance evidence automatically from your integrated systems.',
      steps: [
        'Choose a template for your evidence source (AWS, Azure, Okta, etc.)',
        'Configure your connection settings and credentials',
        'Set a collection schedule (daily, weekly, monthly)',
        'Evidence will be automatically collected and stored'
      ],
      actionLabel: 'Create First Collection'
    },

    monitoring: {
      icon: Shield,
      title: 'No Monitoring Rules Yet',
      description: 'Set up continuous monitoring to track compliance and security in real-time.',
      steps: [
        'Select a monitoring rule template',
        'Configure thresholds and alert conditions',
        'Choose notification channels (email, Slack)',
        'Rules will continuously monitor your systems'
      ],
      actionLabel: 'Create First Rule'
    },

    controlTests: {
      icon: CheckSquare,
      title: 'No Control Tests Yet',
      description: 'Automate testing of security controls to verify effectiveness.',
      steps: [
        'Choose a control test template',
        'Configure test parameters and criteria',
        'Set testing frequency (weekly, monthly, quarterly)',
        'Tests will run automatically and generate evidence'
      ],
      actionLabel: 'Create First Test'
    },

    tasks: {
      icon: ListTodo,
      title: 'No Task Templates Yet',
      description: 'Create task templates for common compliance workflows.',
      steps: [
        'Choose a task template category',
        'Define task checklist and steps',
        'Set assignments and due dates',
        'Tasks will be created automatically when needed'
      ],
      actionLabel: 'Create First Template'
    },

    approvals: {
      icon: FileCheck,
      title: 'No Approval Workflows Yet',
      description: 'Set up approval workflows for policies, exceptions, and changes.',
      steps: [
        'Select a workflow template',
        'Define approval steps and approvers',
        'Configure notifications and actions',
        'Workflows will handle approvals automatically'
      ],
      actionLabel: 'Create First Workflow'
    },

    default: {
      icon: FileText,
      title: resolvedTitle || 'Nothing Here Yet',
      description: resolvedDescription || 'Get started by creating your first item.',
      steps: null,
      actionLabel: actionLabel
    }
  };

  const config = states[type] || states.default;
  const Icon = config.icon;

  return (
    <div className={`flex items-center justify-center min-h-[400px] p-8 ${className}`}>
      <div className="max-w-2xl w-full text-center">

        <div className="flex justify-center mb-6">
          <div className="bg-blue-100 rounded-full p-6">
            <Icon className="w-16 h-16 text-blue-600" />
          </div>
        </div>

        <h3 className="text-2xl font-bold text-gray-900 mb-3">
          {config.title}
        </h3>
        <p className="text-lg text-gray-600 mb-8">
          {config.description}
        </p>

        {showQuickStart && config.steps && (
          <div className="bg-gray-50 rounded-lg p-6 mb-8 text-left max-w-xl mx-auto">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-5 h-5 text-blue-600" />
              <h4 className="font-semibold text-gray-900">Quick Start Guide</h4>
            </div>
            <ol className="space-y-3">
              {config.steps.map((step, index) => (
                <li key={index} className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">
                    {index + 1}
                  </span>
                  <span className="text-gray-700">{step}</span>
                </li>
              ))}
            </ol>
          </div>
        )}

        <button
          onClick={onAction}
          className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
        >
          <Plus className="w-5 h-5" />
          {config.actionLabel}
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default EmptyState;
