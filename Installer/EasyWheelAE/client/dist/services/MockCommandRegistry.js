"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockCommandRegistry = exports.MOCK_COMMANDS = void 0;
exports.MOCK_COMMANDS = [
    {
        id: 'pre_compose',
        name: 'Pre-compose',
        category: 'Layer',
        description: 'Moves selected layers into a new composition.',
        executionType: 'Native',
    },
    {
        id: 'easy_ease',
        name: 'Easy Ease',
        category: 'Animation',
        description: 'Applies easy ease interpolation to selected keyframes.',
        executionType: 'Native',
    },
    {
        id: 'trim_paths',
        name: 'Trim Paths',
        category: 'Shapes',
        description: 'Adds a trim paths operator to selected shape layers.',
        executionType: 'Native',
    },
    {
        id: 'graph_editor',
        name: 'Graph Editor',
        category: 'Timeline',
        description: 'Toggles between the time graph and value graph views.',
        executionType: 'Native',
    },
    {
        id: 'duplicate_layer',
        name: 'Duplicate Layer',
        category: 'Layer',
        description: 'Duplicates the currently selected layer(s).',
        executionType: 'Native',
    },
    {
        id: 'null_object',
        name: 'Create Null Object',
        category: 'Utilities',
        description: 'Creates a new Null Object layer in the active composition.',
        executionType: 'Native',
    },
    {
        id: 'parent_layer',
        name: 'Parent Layer',
        category: 'Layer',
        description: 'Sets parent-child relationship between layers.',
        executionType: 'Native',
    },
    {
        id: 'fast_blur',
        name: 'Fast Box Blur',
        category: 'Effects',
        description: 'Applies a Fast Box Blur effect to the selected layer.',
        executionType: 'Native',
    },
    {
        id: 'toggle_mask',
        name: 'Toggle Mask Path',
        category: 'Masks',
        description: 'Toggles visibility of mask and shape path outlines.',
        executionType: 'Native',
    },
    {
        id: 'shape_layer',
        name: 'Create Shape Layer',
        category: 'Shapes',
        description: 'Creates a new empty shape layer in the composition.',
        executionType: 'Native',
    },
    {
        id: 'toggle_grid',
        name: 'Toggle Grid',
        category: 'View',
        description: 'Toggles the composition grid overlay.',
        executionType: 'Native',
    },
    {
        id: 'align_panel',
        name: 'Align Panel',
        category: 'Panels',
        description: 'Opens the Align panel in the user interface.',
        executionType: 'Native',
    },
    {
        id: 'collect_files',
        name: 'Collect Files',
        category: 'Utilities',
        description: 'Collects source files in After Effects project.',
        executionType: 'Native',
    },
    {
        id: 'scale_fit',
        name: 'Scale to Fit',
        category: 'Composition',
        description: 'Scales selected layer to fit the composition dimensions.',
        executionType: 'Native',
    },
    {
        id: 'export_frame',
        name: 'Export Frame',
        category: 'Composition',
        description: 'Saves current composition frame as an image.',
        executionType: 'Native',
    },
    {
        id: 'time_reverse',
        name: 'Time-Reverse Keyframes',
        category: 'Animation',
        description: 'Reverses the order of selected keyframes in time.',
        executionType: 'Native',
    }
];
class MockCommandRegistry {
    static getAll() {
        return exports.MOCK_COMMANDS;
    }
    static getById(id) {
        return exports.MOCK_COMMANDS.find(cmd => cmd.id === id);
    }
    static search(query, category) {
        let results = exports.MOCK_COMMANDS;
        if (category !== 'All') {
            if (category === 'Favorites') {
                // Mock favorites: Pre-compose and Easy Ease
                results = exports.MOCK_COMMANDS.filter(cmd => cmd.id === 'pre_compose' || cmd.id === 'easy_ease');
            }
            else {
                results = exports.MOCK_COMMANDS.filter(cmd => cmd.category.toLowerCase() === category.toLowerCase());
            }
        }
        if (query.trim()) {
            const q = query.toLowerCase();
            results = results.filter(cmd => cmd.name.toLowerCase().includes(q) ||
                cmd.category.toLowerCase().includes(q) ||
                cmd.description.toLowerCase().includes(q));
        }
        return results;
    }
}
exports.MockCommandRegistry = MockCommandRegistry;
