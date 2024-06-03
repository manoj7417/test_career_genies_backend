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
                size: { type: Number, default: 64 },
                aspectRatio: { type: Number, default: 1 },
                borderRadius: { type: Number, default: 0 },
                effects: {
                    hidden: { type: Boolean, default: false },
                    border: { type: Boolean, default: false },
                    grayscale: { type: Boolean, default: false },
                },
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
            awards: {
                name: { type: String, default: 'Awards' },
                columns: { type: Number, default: 1 },
                visible: { type: Boolean, default: true },
                id: { type: String, default: 'awards' },
                items: [],
            },
            certifications: {
                name: { type: String, default: 'Certifications' },
                columns: { type: Number, default: 1 },
                visible: { type: Boolean, default: true },
                id: { type: String, default: 'certifications' },
                items: [],
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
            volunteer: {
                name: { type: String, default: 'Volunteering' },
                columns: { type: Number, default: 1 },
                visible: { type: Boolean, default: true },
                id: { type: String, default: 'volunteer' },
                items: [],
            },
            interests: {
                name: { type: String, default: 'Interests' },
                columns: { type: Number, default: 1 },
                visible: { type: Boolean, default: true },
                id: { type: String, default: 'interests' },
                items: [],
            },
            languages: {
                name: { type: String, default: 'Languages' },
                columns: { type: Number, default: 1 },
                visible: { type: Boolean, default: true },
                id: { type: String, default: 'languages' },
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
            publications: {
                name: { type: String, default: 'Publications' },
                columns: { type: Number, default: 1 },
                visible: { type: Boolean, default: true },
                id: { type: String, default: 'publications' },
                items: [],
            },
            references: {
                name: { type: String, default: 'References' },
                columns: { type: Number, default: 1 },
                visible: { type: Boolean, default: true },
                id: { type: String, default: 'references' },
                items: [],
            },
            skills: {
                name: { type: String, default: 'Skills' },
                columns: { type: Number, default: 1 },
                visible: { type: Boolean, default: true },
                id: { type: String, default: 'skills' },
                items: [],
            },
            custom: {
            },
        },
        metadata: {
            template: { type: String, default: 'Template3' },
            layout: [
                [
                    [
                        { type: String, default: '' }
                    ],
                ]
            ],
            css: {
                value:
                    { type: String, default: '' },
                visible: { type: Boolean, default: false },
            },
            page: {
                margin: { type: Number, default: 20 },
                format: {
                    type: { type: String, default: 'a4' },
                    enum: ['a4', 'letter'] // Enum for A4 and Letter
                },
                options: {
                    breakLine: { type: Boolean, default: false },
                    pageNumbers: { type: Boolean, default: false },
                },
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