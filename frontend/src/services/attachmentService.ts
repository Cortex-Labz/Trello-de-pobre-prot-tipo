import { api } from './api';

export interface Attachment {
  id: string;
  cardId: string;
  name: string;
  url: string;
  fileSize: number;
  mimeType: string;
  uploadedBy: string;
  uploadedAt: string;
  uploader: {
    id: string;
    name: string;
    avatarUrl: string | null;
  };
}

export interface UploadAttachmentData {
  name: string;
  url: string;
  fileSize: number;
  mimeType: string;
}

export const attachmentService = {
  async uploadAttachment(cardId: string, data: UploadAttachmentData): Promise<Attachment> {
    const response = await api.post(`/cards/${cardId}/attachments`, data);
    return response.data;
  },

  async getAttachments(cardId: string): Promise<Attachment[]> {
    const response = await api.get(`/cards/${cardId}/attachments`);
    return response.data;
  },

  async deleteAttachment(attachmentId: string): Promise<void> {
    await api.delete(`/attachments/${attachmentId}`);
  },
};
