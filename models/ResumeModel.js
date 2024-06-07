const mongoose = require('mongoose')

const ResumeSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    data: {
        basics: {
            name: { type: String, default: '' },
            email: { type: String, default: '' },
            phone: { type: String, default: '' },
            country: { type: String, default: '' },
            city: { type: String, default: '' },
            jobtitle: { type: String, default: '' },
            url: {
                label: { type: String, default: '' },
                href: { type: String, default: '' },
            },
            customFields: [],
            picture: {
                url: { type: String, default: '' },
                visible: { type: Boolean, default: true }
            },
        },
        sections: {
            summary: {
                name: { type: String, default: 'Profile' },
                columns: { type: Number, default: 1 },
                visible: { type: Boolean, default: true },
                id: { type: String, default: 'profile' },
                content: { type: String, default: '' },
            },
            education: {
                name: { type: String, default: 'Education' },
                columns: { type: Number, default: 1 },
                visible: { type: Boolean, default: true },
                id: { type: String, default: 'education' },
                items: [],
            },
            experience: {
                name: { type: String, default: 'Experience' },
                columns: { type: Number, default: 1 },
                visible: { type: Boolean, default: true },
                id: { type: String, default: 'experience' },
                items: [],
            },
            profiles: {
                name: { type: String, default: 'Profiles' },
                columns: { type: Number, default: 1 },
                visible: { type: Boolean, default: true },
                id: { type: String, default: 'profiles' },
                items: [],
            },
            projects: {
                name: { type: String, default: 'Projects' },
                columns: { type: Number, default: 1 },
                visible: { type: Boolean, default: true },
                id: { type: String, default: 'projects' },
                items: [],
            },
            skills: {
                name: { type: String, default: 'Skills' },
                columns: { type: Number, default: 1 },
                visible: { type: Boolean, default: true },
                id: { type: String, default: 'skills' },
                items: [],
            }
        },
        metadata: {
            template: { type: String, default: 'Template3' },
            page: {
                format: {
                    type: { type: String, default: 'a4' },
                    enum: ['a4', 'letter']
                }
            },
            theme: {
                background: { type: String, default: '#ffffff' },
                text: { type: String, default: '#000000' },
                primary: { type: String, default: '#3797BA' },
            },
            typography: {
                font: {
                    family: { type: String, default: 'IBM Plex Sans' },
                    subset: { type: String, default: 'latin' },
                    variants: [{ type: String, default: 'regular' }],
                    size: { type: Number, default: 13.2 },
                },
                lineHeight: { type: Number, default: 2.45 },
                hideIcons: { type: Boolean, default: false },
                underlineLinks: { type: Boolean, default: true },
            },
        },
    },
    title: { type: String, default: 'new resume' },
    status: { type: String, default: 'inProgress', enum: ['inProgress', 'completed', 'downloaded'] },
    isUploading: { type: Boolean, default: false }
}, {
    timestamps: true
})

const Resume = mongoose.model("Resume", ResumeSchema)

module.exports = { Resume }