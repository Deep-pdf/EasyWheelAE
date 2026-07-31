export interface Command {
  id: string;
  name: string;
  category: string;
  description: string;
  executionType: 'Native';
  icon?: string; // placeholder key or name for custom icon
}
