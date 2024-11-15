const dummyData = {
    basics: {
        name: "Jane Jones",
        email: "Jane.Jones@gmail.com",
        phone: "+9112345678",
        country: "CA",
        city: "San Francisco",
        jobtitle: "Business Analyst",
        url: {
            label: "",
            href: "",
        },
        customFields: [],
        picture: {
            url: "https://geniescareerhubbucket.lon1.cdn.digitaloceanspaces.com/GCH_template_images/hometemplateImage.png",
            visible: true
        },
    },
    sections: {
        summary: {
            name: "Profile",
            columns: 1,
            visible: true,
            id: "profile",
            content: "Seasoned IT business analyst with over 12 years in business analytics, specializing in data visualization and BI software, including Qlikview and SAS. Demonstrated success in leading major analytics dashboard projects that enhanced reporting efficiency by 30%. Expertise extends to Agile and Scrum methodologies, JIRA, SQL, ETL, and Master Data Management. Proven ability in boosting operational efficiencies and achieving substantial cost savings through strategic data integration projects.",
        },
        education: {
            name: "Education",
            columns: 1,
            visible: true,
            id: "education",
            items: [
                {
                    startDate: "Sep-2024",
                    endDate: "Dec-2024",
                    city: "San Francisco, CA",
                    description: "",
                    institute: "University of San Francisco",
                    degree: "Master of Science in Information Systems"
                },
                {
                    startDate: "Sep-2024",
                    endDate: "Dec-2024",
                    city: "Berkeley, CA",
                    description: "",
                    institute: "University of California, Berkeley",
                    degree: "Bachelor of Science in Computer Science"
                }
            ],
        },
        experience: {
            name: "Experience",
            columns: 1,
            visible: true,
            id: "experience",
            items: [
                {
                    jobtitle: "Senior Business Analyst",
                    employer: "Genentech",
                    startDate: "Jan-2016",
                    endDate: "present",
                    description: "",
                    city: "South San Francisco, CA",
                    highlights: ["Led the development of an advanced analytics dashboard that improved decision-making speed for senior management by 25%.", 'Facilitated over 40 workshops to define and refine project scopes, translating complex data into actionable insights for cross-functional teams.', 'Conducted in-depth data analysis to validate the feasibility of new dashboard features, which increased user engagement by 15%.', 'Crafted and documented comprehensive data metrics and business rules, significantly enhancing report accuracy and reliability.', 'Coordinated user acceptance testing, resulting in a 10% decrease in post-deployment issues.', 'Provided expert training and support to the operations team, boosting their productivity by 20% in managing production issues.']
                },
                {
                    jobtitle: "Business Systems Analyst",
                    employer: "Amgen",
                    startDate: "Jun-2012",
                    endDate: "Dec-2015",
                    description: "",
                    city: "Thousand Oaks, CA",
                    highlights: ["Implemented a strategic data integration solution that streamlined operations and saved the company $200K annually.", 'Managed a portfolio of data analytics projects, ensuring alignment with business goals and continuous delivery of value.', 'Developed user stories and use cases for BI solutions, improving data-driven decision-making across the organization.', 'Played a key role in the migration of analytics platforms to a more robust system, increasing data processing speed by 30%.', 'Led the documentation efforts for system requirements using JIRA, enhancing team productivity and project tracking.']
                },
                {
                    jobtitle: "Data Analyst",
                    employer: "BioMarin Pharmaceutical",
                    startDate: "Mar-2008",
                    endDate: "May-2012",
                    description: "",
                    city: "San Rafael, CA",
                    highlights: ["Analyzed and interpreted complex data sets to assist with strategic decision-making, influencing key business initiatives.", 'Optimized data collection and analysis processes, improving data quality and reducing time-to-insight by 20%.', 'Contributed to the development of a predictive analytics model that enhanced forecasting accuracy.', 'Supported senior analysts in creating detailed reports and presentations for stakeholders.']
                }
            ],
        },
        projects: {
            name: "Projects",
            columns: 1,
            visible: true,
            id: "projects",
            items: [
                {
                    title: "Analytics Dashboard Enhancement Project",
                    subtitle: "",
                    startDate: "Jan-2024",
                    endDate: "Jan-2024",
                    description: "<p>This initiative resulted in a 30% improvement in reporting efficiency, allowing for quicker and more accurate decision-making across the organization.</p>"
                }
            ],
        },
        skills: {
            name: "Skills",
            columns: 1,
            visible: true,
            id: "skills",
            items: [
                {
                    name: "Data Visualization",
                    level: "Expert"
                }, {
                    name: 'Agile and Scrum',
                    level: "Expert"
                }, {
                    name: 'JIRA',
                    level: "Expert"
                }, {
                    name: "SQL",
                    level: "Expert"
                }, {
                    name: 'Business Intelligence',
                    level: "Expert"
                }
            ],
        }
    }
}

module.exports = { dummyData }