const mongoose = require('mongoose')

const ResumeSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    data: {
        basics: {
            name: String,
            email: String,
            phone: String,
            country: String,
            city: String,
            jobtitle: String,
            url: {
                label: String,
                href: String,
            },
            customFields: [],
            picture: {
                url: String,
                size: Number,
                aspectRatio: Number,
                borderRadius: Number,
                effects: {
                    hidden: Boolean,
                    border: Boolean,
                    grayscale: Boolean,
                },
            },
        },
        sections: {
            summary: {
                name: String,
                columns: Number,
                visible: Boolean,
                id: String,
                content: String,
            },
            awards: {
                name: String,
                columns: Number,
                visible: Boolean,
                id: String,
                items: [],
            },
            certifications: {
                name: String,
                columns: Number,
                visible: Boolean,
                id: String,
                items: [],
            },
            education: {
                name: String,
                columns: Number,
                visible: Boolean,
                id: String,
                items: [],
            },
            experience: {
                name: String,
                columns: Number,
                visible: Boolean,
                id: String,
                items: [],
            },
            volunteer: {
                name: String,
                columns: Number,
                visible: Boolean,
                id: String,
                items: [],
            },
            interests: {
                name: String,
                columns: Number,
                visible: Boolean,
                id: String,
                items: [],
            },
            languages: {
                name: String,
                columns: Number,
                visible: Boolean,
                id: String,
                items: [],
            },
            profiles: {
                name: String,
                columns: Number,
                visible: Boolean,
                id: String,
                items: [],
            },
            projects: {
                name: String,
                columns: Number,
                visible: Boolean,
                id: String,
                items: [],
            },
            publications: {
                name: String,
                columns: Number,
                visible: Boolean,
                id: String,
                items: [],
            },
            references: {
                name: String,
                columns: Number,
                visible: Boolean,
                id: String,
                items: [],
            },
            skills: {
                name: String,
                columns: Number,
                visible: Boolean,
                id: String,
                items: [],
            },
            custom: {
            },
        },
        metadata: {
            template: String,
            layout: [
                [
                    [
                        String
                    ],
                ]
            ],
            css: {
                value:
                    String,
                visible: Boolean,
            },
            page: {
                margin: Number,
                format: {
                    type: String,
                    enum: ['a4', 'letter'] // Enum for A4 and Letter
                },
                options: {
                    breakLine: Boolean,
                    pageNumbers: Boolean,
                },
            },
            theme: {
                background: String,
                text: String,
                primary: String,
            },
            typography: {
                font: {
                    family: String,
                    subset: String,
                    variants: [String],
                    size: Number,
                },
                lineHeight: Number,
                hideIcons: Boolean,
                underlineLinks: Boolean,
            },
        },
    },
    title: { type: String },
    status: {
        type: String,
        enum: ['inProgress', 'completed', 'downloaded'],
        default: 'inProgress'
    }
}, {
    timestamps: true
})

const Resume = mongoose.model("Resume", ResumeSchema)

module.exports = { Resume }