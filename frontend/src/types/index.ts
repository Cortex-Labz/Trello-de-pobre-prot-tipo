// User types
export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  createdAt: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

// Workspace types
export interface Workspace {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  owner?: User;
  members?: WorkspaceMember[];
  boards?: Board[];
  _count?: {
    boards: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceMember {
  id: string;
  workspaceId: string;
  userId: string;
  user: User;
  role: 'ADMIN' | 'MEMBER';
  joinedAt: string;
}

// Board types
export interface Board {
  id: string;
  workspaceId: string;
  workspace?: {
    id: string;
    name: string;
  };
  name: string;
  description?: string;
  backgroundColor?: string;
  backgroundImageUrl?: string;
  visibility: 'PRIVATE' | 'WORKSPACE' | 'PUBLIC';
  isArchived: boolean;
  members?: BoardMember[];
  lists?: List[];
  labels?: Label[];
  createdAt: string;
  updatedAt: string;
}

export interface BoardMember {
  id: string;
  boardId: string;
  userId: string;
  user: User;
  role: 'ADMIN' | 'MEMBER' | 'OBSERVER';
  addedAt: string;
}

// List types
export interface List {
  id: string;
  boardId: string;
  title: string;
  position: number;
  backgroundColor?: string;
  isArchived: boolean;
  cards?: Card[];
  createdAt: string;
  updatedAt: string;
}

// Card types
export interface Card {
  id: string;
  listId: string;
  title: string;
  description?: string;
  position: number;
  dueDate?: string;
  startDate?: string;
  isCompleted: boolean;
  coverUrl?: string;
  coverAttachmentId?: string;
  completionTime?: number; // Tempo em minutos
  isArchived: boolean;
  createdBy: string;
  creator?: User;
  members?: CardMember[];
  labels?: CardLabel[];
  checklists?: Checklist[];
  comments?: Comment[];
  attachments?: Attachment[];
  createdAt: string;
  updatedAt: string;
}

export interface CardMember {
  id: string;
  cardId: string;
  userId: string;
  user: User;
  assignedAt: string;
}

// Label types
export interface Label {
  id: string;
  boardId: string;
  name: string;
  color: string;
}

export interface CardLabel {
  cardId: string;
  labelId: string;
  label: Label;
}

// Checklist types
export interface Checklist {
  id: string;
  cardId: string;
  title: string;
  position: number;
  items: ChecklistItem[];
  createdAt: string;
}

export interface ChecklistItem {
  id: string;
  checklistId: string;
  title: string;
  isCompleted: boolean;
  position: number;
  createdAt: string;
  updatedAt: string;
}

// Comment types
export interface Comment {
  id: string;
  cardId: string;
  userId: string;
  user: User;
  content: string;
  createdAt: string;
  updatedAt: string;
}

// Attachment types
export interface Attachment {
  id: string;
  cardId: string;
  name: string;
  url: string;
  fileSize: number;
  mimeType: string;
  uploadedBy: string;
  uploader: User;
  uploadedAt: string;
}

// Activity types
export interface Activity {
  id: string;
  boardId: string;
  cardId?: string;
  userId: string;
  user: User;
  actionType: 'CREATED' | 'UPDATED' | 'MOVED' | 'ARCHIVED' | 'DELETED' | 'COMMENTED' | 'ASSIGNED' | 'LABELED' | 'ATTACHED' | 'COVER_CHANGED' | 'DUE_DATE_CHANGED' | 'COMPLETION_TIME_SET';
  details?: string; // JSON string
  createdAt: string;
  card?: {
    id: string;
    title: string;
  };
}

// API Response types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  errors?: any[];
}
