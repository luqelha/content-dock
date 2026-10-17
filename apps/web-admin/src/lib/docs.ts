export type DocSection = {
  id: string;
  title: string;
  paragraphs?: string[];
  steps?: { title: string; description: string }[];
  note?: { title: string; text: string };
  table?: { headers: string[]; rows: string[][] };
  links?: { title: string; description: string; href: string }[];
};

export type DocPage = {
  slug: string;
  title: string;
  group: string;
  description: string;
  sections: DocSection[];
};

export const docPages: DocPage[] = [
  {
    slug: "",
    title: "Introduction",
    group: "Getting started",
    description:
      "Learn your way around ContentDock. A shared workspace for your content, files, and the people behind them.",
    sections: [
      {
        id: "what-is-contentdock",
        title: "What is ContentDock?",
        paragraphs: [
          "ContentDock brings content publishing and workspace administration together. Write and organize articles, keep your media in one place, and give each teammate the access they need.",
          "Everything belongs to a workspace. You can use one account across several organizations, while keeping their content, files, and members separate.",
        ],
        note: {
          title: "Start with the essentials",
          text: "New to ContentDock? Follow the quick start to create or join a workspace and publish your first piece of content.",
        },
      },
      {
        id: "explore-the-guides",
        title: "Explore the guides",
        links: [
          {
            title: "Quick start",
            description: "From your first sign-in to your first article.",
            href: "/docs/quick-start",
          },
          {
            title: "Content & publishing",
            description: "Write, organize, and publish with your team.",
            href: "/docs/content",
          },
          {
            title: "Media library",
            description: "Upload and find images and documents.",
            href: "/docs/media",
          },
          {
            title: "Members & roles",
            description: "Invite colleagues and manage access.",
            href: "/docs/members",
          },
        ],
      },
      {
        id: "your-workspace-at-a-glance",
        title: "Your workspace at a glance",
        paragraphs: [
          "Use the sidebar to move between your day-to-day tools. The workspace selector at the top switches your organization; your profile and sign-out controls sit at the bottom.",
        ],
        table: {
          headers: ["Area", "What you can do"],
          rows: [
            [
              "Overview",
              "See content, publication, media, and membership counts, plus recent records.",
            ],
            [
              "Content & categories",
              "Find articles, manage drafts, and organize topics.",
            ],
            ["Media library", "Browse workspace images and PDFs."],
            [
              "Administration",
              "Manage members, audit records, exports, and settings. Available to administrators.",
            ],
          ],
        },
      },
      {
        id: "before-you-begin",
        title: "Before you begin",
        paragraphs: [
          "You can read these guides without signing in. To work in ContentDock, sign in to your account and select a workspace. The actions you see depend on your role in that workspace.",
          "The guides use the same English labels you will find in the application. Use the theme switch in the header to choose a light or dark appearance.",
        ],
      },
    ],
  },
  {
    slug: "quick-start",
    title: "Quick start",
    group: "Getting started",
    description:
      "Set up your workspace and take your first article from draft to published.",
    sections: [
      {
        id: "create-your-account",
        title: "Create your account",
        steps: [
          {
            title: "Register or sign in",
            description:
              "Choose Create an account on the home page, complete the registration form, then sign in. If you already have an account, use Sign in.",
          },
          {
            title: "Create or join a workspace",
            description:
              "Create a workspace for your organization, or open the invitation link shared by your administrator. Accept an invitation while signed in with the invited email address.",
          },
          {
            title: "Check your active workspace",
            description:
              "The workspace name appears at the top of the dashboard sidebar. Select it to switch between organizations.",
          },
        ],
        links: [
          {
            title: "Create an account",
            description: "Open the registration form.",
            href: "/register",
          },
        ],
      },
      {
        id: "publish-your-first-article",
        title: "Publish your first article",
        paragraphs: [
          "You need an Admin or Editor role to create and publish content.",
        ],
        steps: [
          {
            title: "Open Content",
            description:
              "Select Content in the sidebar, then open the create-content form.",
          },
          {
            title: "Write your article",
            description:
              "Enter a title and body. Add a slug if you want to choose the identifier yourself, and select a category if needed.",
          },
          {
            title: "Save a draft",
            description:
              "Keep the status set to Draft and select Save Draft. Open the article again whenever you are ready to continue.",
          },
          {
            title: "Publish when ready",
            description:
              "Change the status to Published and select Publish Now. The record becomes available as published content through the authenticated content API.",
          },
        ],
        note: {
          title: "Save your work",
          text: "Use the save or publish button before leaving the editor. ContentDock does not automatically save your edits.",
        },
      },
      {
        id: "bring-your-team",
        title: "Bring your team",
        paragraphs: [
          "If you created the workspace, you are its administrator. Open Members, choose Invite member, and share the generated invitation link with your colleague. Choose Editor for teammates who publish, or Viewer for read access.",
        ],
        links: [
          {
            title: "Members & roles",
            description: "Learn about invitations and permissions.",
            href: "/docs/members",
          },
        ],
      },
    ],
  },
  {
    slug: "workspaces",
    title: "Workspaces",
    group: "Getting started",
    description:
      "Create an organization, switch between teams, and keep your work in the right place.",
    sections: [
      {
        id: "create-a-workspace",
        title: "Create a workspace",
        steps: [
          {
            title: "Open the workspace selector",
            description:
              "Select the workspace name at the top of the sidebar, then choose Create workspace.",
          },
          {
            title: "Enter organization details",
            description:
              "Add a workspace name. You can also provide an optional, unique workspace domain using lowercase letters, numbers, dots, and hyphens.",
          },
          {
            title: "Create your workspace",
            description:
              "Select Create workspace. ContentDock opens the dashboard for your new organization.",
          },
        ],
        note: {
          title: "About workspace domains",
          text: "The domain is an identifier. Entering a domain does not configure DNS or publish a website at that address.",
        },
      },
      {
        id: "switch-workspaces",
        title: "Switch workspaces",
        paragraphs: [
          "Open the workspace selector and choose an organization from the list. The dashboard and its records update to match that workspace.",
          "Your role can differ between workspaces. Being an administrator in one organization does not give you administrator access to another.",
        ],
      },
      {
        id: "join-an-existing-workspace",
        title: "Join an existing workspace",
        paragraphs: [
          "Ask an administrator for an invitation link. Sign in with the email address named in the invitation and open the link to accept it. Once accepted, the workspace becomes available in your selector.",
          "If the link has expired, ask the administrator to create a new invitation.",
        ],
      },
      {
        id: "update-workspace-details",
        title: "Update workspace details",
        paragraphs: [
          "Administrators can open Settings to update the workspace name and domain. Select Save changes to apply the update for everyone in that workspace. You can also find your workspace ID and current role on this page.",
        ],
        links: [
          {
            title: "Open workspace",
            description: "Return to your dashboard.",
            href: "/dashboard",
          },
        ],
      },
    ],
  },
  {
    slug: "content",
    title: "Content & publishing",
    group: "Using ContentDock",
    description:
      "Create articles, manage drafts, and keep your publishing workflow organized.",
    sections: [
      {
        id: "find-your-content",
        title: "Find your content",
        paragraphs: [
          "Open Content from the sidebar to browse the active workspace's articles. Search and use the available status and category filters to narrow the list. Use pagination to move through results, then open a record to read or edit it.",
        ],
      },
      {
        id: "create-and-edit",
        title: "Create and edit an article",
        steps: [
          {
            title: "Add a title and body",
            description:
              "Open the create-content form. Enter a title and write the article in the rich-text editor. Use the editor toolbar to format your text.",
          },
          {
            title: "Choose a slug and category",
            description:
              "Set an optional slug, or leave it blank to let ContentDock generate one. Choose a category to organize the article; you can also leave it uncategorized.",
          },
          {
            title: "Save your changes",
            description:
              "Choose the status and select the primary save button. When editing an already published article, use Save & Update to persist your changes.",
          },
        ],
        note: {
          title: "Who can edit?",
          text: "Admins and Editors can create and edit articles. Viewers can read content but cannot save changes.",
        },
      },
      {
        id: "draft-and-published",
        title: "Draft and published status",
        table: {
          headers: ["Status", "When to use it", "Save action"],
          rows: [
            [
              "Draft",
              "Work in progress, available to workspace members.",
              "Save Draft",
            ],
            [
              "Published",
              "Ready for delivery through the authenticated content API.",
              "Publish Now / Save & Update",
            ],
          ],
        },
        paragraphs: [
          "To return an article to draft, open it, change the status to Draft, and save. Publishing changes the content status; it does not create a public website or a public preview link.",
        ],
      },
      {
        id: "delete-content",
        title: "Delete content",
        paragraphs: [
          "Administrators can use the delete action on a content record. Review the confirmation before proceeding. Deletion removes the record from the workspace. Keep a separate copy of anything you need to retain; revision history and a restore workflow are not available.",
        ],
        links: [
          {
            title: "Categories",
            description: "Organize articles by topic.",
            href: "/docs/categories",
          },
        ],
      },
    ],
  },
  {
    slug: "categories",
    title: "Categories",
    group: "Using ContentDock",
    description:
      "Give your content a clear structure with shared workspace categories.",
    sections: [
      {
        id: "create-a-category",
        title: "Create a category",
        paragraphs: [
          "Admins and Editors can manage categories. Open Categories in the sidebar and use the create action. Enter a name, review the slug, add a description if needed, and save.",
          "Choose names your team will recognize, such as Product updates, Guides, or Company news. Categories belong to the current workspace.",
        ],
      },
      {
        id: "assign-a-category",
        title: "Assign a category to content",
        paragraphs: [
          "Open an article and choose a category in the content form. Save the article to apply the assignment. If the category you need does not exist, use the create-category action in the editor.",
          "Each article can have one category or remain uncategorized. Use the category filter in Content to browse related articles.",
        ],
      },
      {
        id: "maintain-your-categories",
        title: "Maintain your categories",
        paragraphs: [
          "Admins and Editors can use the edit action in Categories to update a name, slug, or description. Only administrators can delete categories. Before deleting one, review the confirmation and consider how your team uses it to organize content.",
        ],
        links: [
          {
            title: "Content & publishing",
            description: "Use categories in your editorial workflow.",
            href: "/docs/content",
          },
        ],
      },
    ],
  },
  {
    slug: "media",
    title: "Media library",
    group: "Using ContentDock",
    description:
      "Upload, browse, and download the images and documents your workspace uses.",
    sections: [
      {
        id: "upload-files",
        title: "Upload files",
        steps: [
          {
            title: "Open Media library",
            description:
              "Select Media library in the sidebar, then choose the upload action. You need an Admin or Editor role to upload files.",
          },
          {
            title: "Choose your files",
            description:
              "Drag files into the upload area or browse your device. Supported types include PNG, JPG/JPEG, WebP, GIF, and PDF. Check the file-size limit shown in the upload form.",
          },
          {
            title: "Review and upload",
            description:
              "Review the file queue and start the upload. Wait for completion and check any per-file errors before closing the dialog.",
          },
        ],
      },
      {
        id: "preview-and-download",
        title: "Preview and download",
        paragraphs: [
          "Browse the library and use its search or filters to find a file. Open a file's preview to inspect it, view its details, or download a copy.",
          "Media files are private to the workspace. Preview and download requests require an authenticated account with access to that workspace.",
        ],
        note: {
          title: "Sharing media",
          text: "A media preview URL is not a public sharing link. Colleagues need to sign in and have access to the workspace.",
        },
      },
      {
        id: "delete-a-file",
        title: "Delete a file",
        paragraphs: [
          "Admins and Editors can use a file's delete action. Review the confirmation and check whether the file is still needed by your content before deleting it. Keep another copy if you need to retain the original.",
        ],
      },
    ],
  },
  {
    slug: "members",
    title: "Members & roles",
    group: "Administration",
    description:
      "Invite your team and give each person the right level of workspace access.",
    sections: [
      {
        id: "understand-roles",
        title: "Understand roles",
        paragraphs: [
          "Permissions apply to the selected workspace. Only administrators see the Administration tools in the sidebar.",
        ],
        table: {
          headers: ["Capability", "Admin", "Editor", "Viewer"],
          rows: [
            ["Read content, categories, and media", "Yes", "Yes", "Yes"],
            ["Create, edit, and publish content", "Yes", "Yes", "No"],
            ["Create and edit categories; manage media", "Yes", "Yes", "No"],
            ["Delete content and categories", "Yes", "No", "No"],
            ["Manage members and workspace settings", "Yes", "No", "No"],
            ["Review audit trail and request exports", "Yes", "No", "No"],
            ["Update own profile", "Yes", "Yes", "Yes"],
          ],
        },
      },
      {
        id: "invite-a-member",
        title: "Invite a member",
        steps: [
          {
            title: "Create an invitation",
            description:
              "Open Members, select Invite member, enter your colleague's email, and choose a role.",
          },
          {
            title: "Share the invitation link",
            description:
              "Copy the generated link and send it to your colleague through your usual communication channel. ContentDock does not send an invitation email automatically.",
          },
          {
            title: "Have your colleague accept",
            description:
              "The recipient signs in with the invited email and opens the link to accept. Invitations expire after seven days.",
          },
        ],
      },
      {
        id: "change-or-remove-access",
        title: "Change or remove access",
        paragraphs: [
          "Search Members by name or email, or filter by role. Use a member's role selector to change their permissions. To remove workspace access, choose Remove and confirm.",
          "Removing a member removes their access to this workspace. Their account and memberships in other workspaces remain separate.",
        ],
        note: {
          title: "Keep an administrator",
          text: "A workspace must retain an administrator. Assign another administrator before removing or changing the role of the last one.",
        },
      },
    ],
  },
  {
    slug: "audit",
    title: "Audit trail",
    group: "Administration",
    description:
      "Review the changes made in your workspace and find the records you need.",
    sections: [
      {
        id: "read-activity",
        title: "Read workspace activity",
        paragraphs: [
          "Administrators can open Audit trail from the sidebar. Each row shows the time in UTC, action, entity, and actor associated with an event.",
          "Select View details to inspect the actor ID, record ID, IP address, and available event metadata. Credentials and content bodies are excluded from audit metadata.",
        ],
      },
      {
        id: "filter-records",
        title: "Filter records",
        steps: [
          {
            title: "Choose an action or entity",
            description:
              "Enter an action such as CREATE_CONTENT, an entity such as Content, or both.",
          },
          {
            title: "Apply the filters",
            description:
              "Select Apply filters, then use the page controls to browse the results. Choose Clear to remove the filters.",
          },
        ],
      },
      {
        id: "download-audit-records",
        title: "Download audit records",
        paragraphs: [
          "Choose Export logs to open Exports, then select a date range for a downloadable archive. Audit-list filters are separate from the export date range.",
        ],
        links: [
          {
            title: "Exports",
            description: "Prepare a ZIP archive of audit records.",
            href: "/docs/exports",
          },
        ],
      },
    ],
  },
  {
    slug: "exports",
    title: "Exports",
    group: "Administration",
    description:
      "Prepare and download a date-bounded archive of your workspace audit records.",
    sections: [
      {
        id: "create-an-export",
        title: "Create an export",
        steps: [
          {
            title: "Open Exports",
            description:
              "Select Exports in the Administration section of the sidebar. Only administrators can request audit exports.",
          },
          {
            title: "Choose a date range",
            description:
              "Select a start date and an inclusive end date in UTC. The range can cover up to 366 days.",
          },
          {
            title: "Queue the archive",
            description:
              "Select Create export. ContentDock prepares the archive in the background and displays its status and progress.",
          },
        ],
      },
      {
        id: "download-your-archive",
        title: "Download your archive",
        paragraphs: [
          "When the status reaches Completed, choose Download ZIP. The archive contains audit records in newline-delimited JSON format.",
          "The page URL includes the job identifier. Keep that URL if you need to revisit the export while it is being prepared.",
        ],
        note: {
          title: "Download availability",
          text: "Exports are available for 24 hours and can only be downloaded by the administrator who requested them. Create a new export if the archive has expired.",
        },
      },
      {
        id: "export-status",
        title: "Understand export status",
        paragraphs: [
          "The status and progress update while the archive is being prepared. If the job fails, read the displayed error and submit a new request after resolving the issue. If it remains pending, contact your application administrator.",
        ],
        note: {
          title: "What is included?",
          text: "Exports contain workspace audit records for the chosen period. They are not a backup of articles, media files, or the full workspace.",
        },
      },
    ],
  },
  {
    slug: "profile",
    title: "Profile & preferences",
    group: "Your account",
    description:
      "Keep your personal details up to date and choose the appearance that works for you.",
    sections: [
      {
        id: "update-your-profile",
        title: "Update your profile",
        paragraphs: [
          "Select your name or avatar at the bottom of the dashboard sidebar to open My profile. Update your personal details or avatar, then save your changes.",
          "Your profile belongs to your account and follows you across workspaces. Workspace names and domains are managed separately in Settings.",
        ],
      },
      {
        id: "change-your-password",
        title: "Change your password",
        paragraphs: [
          "Use the password section in My profile. Enter your current password and the new password, then save. Follow the validation messages if a field needs attention.",
          "If you cannot sign in, contact your application administrator. Password recovery by email is not currently available.",
        ],
      },
      {
        id: "choose-your-theme",
        title: "Choose your theme",
        paragraphs: [
          "Use the sun and moon switch in the header to toggle between light and dark mode. The documentation and the workspace use the same theme preference.",
        ],
      },
      {
        id: "sign-out",
        title: "Sign out",
        paragraphs: [
          "Choose Sign out at the bottom of the dashboard sidebar when you finish working on a shared device. Save any changes in the editor first.",
        ],
      },
    ],
  },
  {
    slug: "troubleshooting",
    title: "Troubleshooting",
    group: "Your account",
    description:
      "Find the next step when access, uploads, or workspace actions do not behave as expected.",
    sections: [
      {
        id: "missing-workspace",
        title: "I cannot find my workspace",
        paragraphs: [
          "Check that you signed in with the correct email address. Open the workspace selector to see the organizations you belong to. If you were invited, open and accept the invitation using the invited email.",
          "If the invitation expired, ask your administrator for a new link. A workspace appears only after you have access to it.",
        ],
      },
      {
        id: "missing-actions",
        title: "I cannot edit or see administration tools",
        paragraphs: [
          "Check your selected workspace and role. Viewers have read access; Editors can manage content, categories, and media. Members, Audit trail, Exports, and Settings require an Admin role.",
          "Ask a workspace administrator to review your membership if you need additional permissions.",
        ],
      },
      {
        id: "upload-failed",
        title: "My file upload failed",
        paragraphs: [
          "Check that the file is a supported image or PDF and is within the limit shown in the upload dialog. Read the error next to the file, remove invalid files from the queue, and retry.",
          "If a preview or download is denied, check that you are signed in and still have access to the workspace that owns the file.",
        ],
      },
      {
        id: "export-unavailable",
        title: "My export is unavailable",
        paragraphs: [
          "Sign in as the administrator who requested the archive. Wait for the job to complete before downloading. Downloads expire after 24 hours; request a new export if needed.",
          "For a failed job, review the displayed message and retry. If jobs remain pending, contact your application administrator.",
        ],
      },
      {
        id: "service-unavailable",
        title: "The application shows a service error",
        paragraphs: [
          "Retry the page after a short wait. If the issue persists, share the page name, displayed error, and approximate time with your application administrator. Avoid including your password or other account secrets.",
        ],
      },
    ],
  },
];

export const docGroups = [...new Set(docPages.map((page) => page.group))];
export function docHref(slug: string) {
  return slug ? `/docs/${slug}` : "/docs";
}
