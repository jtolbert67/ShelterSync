
import { StatusColor } from './types';

export const STATUS_COLORS: Record<StatusColor, string> = {
  red: 'bg-red-100 text-red-800 border-red-200',
  blue: 'bg-blue-100 text-blue-800 border-blue-200',
  green: 'bg-green-100 text-green-800 border-green-200',
  yellow: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  purple: 'bg-purple-100 text-purple-800 border-purple-200',
  gray: 'bg-gray-100 text-gray-800 border-gray-200',
};

export const COLOR_PICKER_OPTIONS: { value: StatusColor; label: string; hex: string }[] = [
  { value: 'red', label: 'Red', hex: '#fee2e2' },
  { value: 'blue', label: 'Blue', hex: '#dbeafe' },
  { value: 'green', label: 'Green', hex: '#dcfce7' },
  { value: 'yellow', label: 'Yellow', hex: '#fef9c3' },
  { value: 'purple', label: 'Purple', hex: '#f3e8ff' },
  { value: 'gray', label: 'Gray', hex: '#f3f4f6' },
];

export const GENDER_OPTIONS = ['Male', 'Female', 'Non-binary', 'Other', 'Prefer not to say'];

export const INITIAL_RESIDENTS = [
  {
    id: '1',
    name: 'John Doe',
    photoUrl: 'https://picsum.photos/seed/john/200',
    statusText: 'Active',
    statusColor: 'green' as StatusColor,
    bio: 'Long-term resident focusing on job placement.',
    gender: 'Male',
    customFieldLabel: 'Case Manager',
    customFieldValue: 'Sarah Williams',
    isCheckedIn: true,
    lastActionAt: new Date().toISOString(),
    notes: 'Needs morning meds reminder.'
  },
  {
    id: '2',
    name: 'Jane Smith',
    photoUrl: 'https://picsum.photos/seed/jane/200',
    statusText: 'Restricted',
    statusColor: 'red' as StatusColor,
    bio: 'New arrival, exploring local services.',
    gender: 'Female',
    customFieldLabel: 'Dietary Needs',
    customFieldValue: 'Gluten Free',
    isCheckedIn: false,
    lastActionAt: new Date().toISOString(),
    currentDestination: 'Grocery Store',
    expectedReturnTime: '18:00',
    notes: 'Allergic to peanuts.'
  }
];
