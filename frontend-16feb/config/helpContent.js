export const helpContent = {

  evidenceAutomation: {
    pageTitle: {
      title: "Evidence Automation",
      description: "Automatically collect compliance evidence from integrated systems on a schedule."
    },

    whatIsEvidence: {
      title: "What is Evidence Collection?",
      content: "Evidence collection automates the gathering of compliance artifacts (logs, configurations, reports) from your integrated systems. Instead of manually collecting evidence for audits, SecureWise does it automatically on your schedule."
    },

    templates: {
      title: "What are Evidence Templates?",
      content: "Templates are pre-configured collection rules for common compliance needs. Select a template, customize the settings, and schedule automatic collection. No coding required!"
    },

    scheduling: {
      title: "Collection Schedules",
      content: "Choose when evidence is collected: Daily, Weekly, Monthly, or Quarterly. Evidence is automatically collected and stored in your Evidence Ledger with timestamps and metadata."
    }
  },

  continuousMonitoring: {
    pageTitle: {
      title: "Continuous Monitoring",
      description: "Monitor security controls and compliance requirements in real-time with automated rules."
    },

    whatIsMonitoring: {
      title: "What is Continuous Monitoring?",
      content: "Continuous monitoring automatically checks your systems against security and compliance requirements 24/7. Rules run on schedule and generate alerts when issues are detected."
    },

    ruleTemplates: {
      title: "Monitoring Rule Templates",
      content: "Pre-built rules for common compliance checks: access controls, encryption status, patch levels, configuration drift, and more. Each template includes recommended alert thresholds and actions."
    }
  },

  controlTests: {
    pageTitle: {
      title: "Control Test Scripts",
      description: "Automated testing of security controls to verify effectiveness and compliance."
    },

    whatAreTests: {
      title: "What are Control Tests?",
      content: "Control tests verify that security controls are working as designed. Tests run automatically on schedule and document results for audit evidence."
    },

    testTemplates: {
      title: "Test Script Templates",
      content: "Pre-built test procedures for common control types: access controls, encryption, backups, incident response, and more. Each template includes test steps and pass/fail criteria."
    }
  },

  taskManagement: {
    pageTitle: {
      title: "Task Management",
      description: "Organize compliance work with automated task assignments and tracking."
    },

    whatAreTasks: {
      title: "What are Task Templates?",
      content: "Task templates create pre-configured checklists for common compliance activities: onboarding, audits, incident response, risk assessments, and more."
    }
  },

  approvals: {
    pageTitle: {
      title: "Approvals & Workflows",
      description: "Multi-step approval workflows for policies, exceptions, and changes."
    },

    whatAreWorkflows: {
      title: "What are Approval Workflows?",
      content: "Workflows automate approval processes for policies, risk exceptions, control changes, and more. Define approval steps, approvers, and actions for each stage."
    }
  },

  dashboard: {
    pageTitle: {
      title: "Executive Dashboard",
      description: "Real-time visibility into compliance posture and security metrics."
    },

    kpis: {
      title: "Key Performance Indicators",
      content: "Track critical metrics: compliance score, control effectiveness, open risks, incident counts, and audit readiness. Compare against targets and trends."
    }
  },

  fields: {
    apiEndpoint: {
      content: "Enter the full API URL including protocol (https://). Example: https://api.example.com/v1/users"
    },
    apiKey: {
      content: "Your API key or authentication token. Keep this secret! Keys are encrypted in our database."
    },
    schedule: {
      content: "Choose when this task runs: Daily (every day at set time), Weekly (specific day), Monthly (specific date), or Quarterly (every 3 months)"
    },
    severity: {
      content: "Critical = Immediate action required, High = Address within 24h, Medium = Address within week, Low = Address as time permits"
    }
  }
};

export default helpContent;
