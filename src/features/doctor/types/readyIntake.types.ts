export type OldcartField =
  | "onset"
  | "location"
  | "duration"
  | "characteristics"
  | "aggreviating and alleviating factors"
  | "related symptoms"
  | "treatments tried";

export type FileAttachment = {
  id: string;
  name: string;
  type: "image" | "pdf" | "document";
  url: string;
  uploadedAt: string;
}
