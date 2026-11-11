import type { Block, PolicyDoc } from "./privacy";

const p = (text: string): Block => ({ kind: "p", text });
const ul = (...items: string[]): Block => ({ kind: "ul", items });
const ol = (...items: string[]): Block => ({ kind: "ol", items });

export const EN: PolicyDoc = {
  lead: [
    p("This Privacy Policy governs the procedure for the collection, use, storage, processing and protection of the personal data of users of the WomanUP platform."),
    p("WomanUP is a digital platform and marketplace intended for finding and selecting educational programmes, courses, events, internships, vacancies and other opportunities for professional and personal development."),
    p("By using the WomanUP website, registering on the platform, completing forms or providing their personal data, the User confirms that they have read this Privacy Policy and accept its terms in the manner prescribed by law."),
  ],
  sections: [
    {
      n: "1",
      title: "General provisions",
      blocks: [
        p("1.1. This Policy applies to all users of the WomanUP website and digital services."),
        p("1.2. The Policy covers information that WomanUP receives from the User when the User:"),
        ul(
          "registers on the platform;",
          "creates a profile;",
          "completes questionnaires;",
          "submits applications for educational programmes;",
          "searches for vacancies and internships;",
          "creates or uploads a CV;",
          "takes part in events;",
          "contacts the support service;",
          "uses the website and its functionality.",
        ),
        p("1.3. WomanUP processes personal data in accordance with the applicable legislation of the Republic of Uzbekistan, including the legislation on personal data."),
        p("1.4. The main principles of personal data processing are lawfulness, purposefulness, accuracy, confidentiality and ensuring the security of personal data."),
      ],
    },
    {
      n: "2",
      title: "What personal data we may collect",
      blocks: [
        p("Depending on the functions used, WomanUP may process the following categories of data:"),
      ],
      groups: [
        {
          title: "2.1. Account data",
          blocks: [
            ul(
              "first name and surname;",
              "email address;",
              "telephone number;",
              "password in protected form;",
              "profile photograph;",
              "information about the city or region of residence.",
            ),
          ],
        },
        {
          title: "2.2. Educational information",
          blocks: [
            p("The User may, at their own discretion, provide:"),
            ul(
              "level of education;",
              "educational institution;",
              "field of study;",
              "professional skills;",
              "courses completed;",
              "certificates;",
              "experience of participation in educational programmes;",
              "fields of study of interest.",
            ),
          ],
        },
        {
          title: "2.3. Career information",
          blocks: [
            p("When using the career functions, the User may provide:"),
            ul(
              "information about previous work experience;",
              "job title;",
              "professional skills;",
              "portfolio;",
              "CV;",
              "desired position;",
              "preferred working arrangement;",
              "information about professional achievements;",
              "other information that the User specifies at their own discretion in the profile or CV.",
            ),
          ],
        },
        {
          title: "2.4. Technical information",
          blocks: [
            p("When the website is used, technical information may be collected automatically, including:"),
            ul(
              "IP address;",
              "device type;",
              "operating system;",
              "browser type;",
              "interface language;",
              "date and time of the visit;",
              "pages and sections of the website visited by the User;",
              "technical details of interaction with the website.",
            ),
          ],
        },
      ],
    },
    {
      n: "3",
      title: "Purposes of personal data processing",
      blocks: [
        p("WomanUP may use the User's personal data for the following purposes:"),
        ol(
          "Creating and maintaining the user account.",
          "Providing access to the platform's functions.",
          "Selecting educational programmes and other opportunities in line with the User's interests.",
          "Processing applications for participation in educational programmes, events, internships and other offers.",
          "Assisting the User in searching for vacancies and career opportunities.",
          "Creating and displaying the user profile and CV in accordance with the User's settings.",
          "Transferring the necessary data to educational organisations, programme organisers or prospective employers where this is necessary for the User's participation in the relevant opportunity and is permitted by law and by the User's consent.",
          "Communicating with the User on matters concerning the operation of the platform, applications, educational programmes and career opportunities.",
          "Providing technical support.",
          "Improving the quality and functionality of WomanUP.",
          "Analysing the use of the platform and identifying technical problems.",
          "Preventing fraud, abuse and breaches of the platform rules.",
          "Complying with the requirements of the legislation of the Republic of Uzbekistan.",
        ),
      ],
    },
    {
      n: "4",
      title: "Use of data for matching opportunities",
      blocks: [
        p("WomanUP may use information provided by the User to suggest educational programmes, vacancies, internships and other opportunities that may correspond to the User's interests, education, skills and professional goals."),
        p("Such recommendations may be generated automatically or with the use of the platform's internal tools."),
        p("WomanUP's recommendations do not constitute a guarantee that a particular programme, vacancy or other opportunity will suit the User or will lead to a particular result."),
      ],
    },
    {
      n: "5",
      title: "Job search and no guarantee of employment",
      blocks: [
        p("WomanUP provides users with tools for searching for vacancies, internships and other career opportunities."),
        p("The platform may help the User to:"),
        ul(
          "find suitable vacancies;",
          "find employers;",
          "create or post a CV;",
          "submit applications;",
          "obtain information about career opportunities;",
          "interact with employers or organisations.",
        ),
        p("**However, WomanUP does not guarantee the User's employment.**"),
        p("Use of the platform does not mean that any of the following is guaranteed:"),
        ul(
          "obtaining a job;",
          "passing an interview;",
          "being hired;",
          "the conclusion of an employment contract;",
          "obtaining a particular position;",
          "receiving a particular salary;",
          "completing an internship;",
          "receiving a job offer.",
        ),
        p("The decision on hiring, inviting to an interview, participation in an internship or the provision of another opportunity is taken independently by the relevant employer, educational organisation or other partner."),
        p("WomanUP is not the User's employer unless expressly stated otherwise in a specific offer."),
      ],
    },
    {
      n: "6",
      title: "Transfer of personal data to third parties",
      blocks: [
        p("WomanUP does not sell users' personal data to third parties."),
        p("Personal data may be provided to third parties only where this is necessary for the operation of the relevant platform function, the fulfilment of the User's request, the performance of a contract, compliance with the requirements of the law, or where there is another lawful basis."),
        p("In particular, depending on the function chosen by the User, data may be transferred to:"),
        ul(
          "educational organisations;",
          "organisers of educational programmes;",
          "employers;",
          "organisations offering internships;",
          "technical and IT providers that support the operation of the platform;",
          "payment services, if payment functions are used on the platform;",
          "state authorities in cases provided for by law.",
        ),
        p("Data may be transferred to an employer or educational organisation for the consideration of a candidacy only to the extent necessary for the relevant purpose."),
      ],
    },
    {
      n: "7",
      title: "The User's public profile",
      blocks: [
        p("If WomanUP provides the option of creating a public profile, the User independently determines which information may be available to other users of the platform or to third parties."),
        p("The User is responsible for the information that the User independently posts in the public profile, portfolio, CV or other publicly accessible sections of the platform."),
        p("The following should not be made publicly available:"),
        ul(
          "passwords;",
          "banking details;",
          "passport details;",
          "bank card details;",
          "other confidential information not intended for public posting.",
        ),
      ],
    },
    {
      n: "8",
      title: "The User's consent",
      blocks: [
        p("In cases provided for by law, WomanUP obtains the User's consent to the processing of their personal data."),
        p("The User has the right not to provide certain data; however, the absence of the necessary data may make it impossible to use certain functions of the platform."),
        p("For example, without contact information it may be impossible to:"),
        ul(
          "create an account;",
          "contact the User;",
          "process an application;",
          "send information about an educational programme;",
          "forward an application to an employer.",
        ),
      ],
    },
    {
      n: "9",
      title: "Storage of personal data",
      blocks: [
        p("WomanUP takes the necessary organisational and technical measures to protect personal data against:"),
        ul(
          "unlawful access;",
          "alteration;",
          "destruction;",
          "loss;",
          "dissemination;",
          "copying;",
          "other unlawful actions.",
        ),
        p("Personal data are stored for no longer than is necessary to achieve the purposes of their processing, unless a longer retention period is required by law or by another lawful basis."),
      ],
    },
    {
      n: "10",
      title: "Account security",
      blocks: [
        p("The User is obliged to ensure independently the confidentiality of the credentials used to log in to their account."),
        p("The User must not disclose the password or other account access credentials to third parties."),
        p("If the User discovers suspicious activity, loss of access or suspected unauthorised access to the account, the User must notify WomanUP immediately."),
      ],
    },
    {
      n: "11",
      title: "Cookies and similar technologies",
      blocks: [
        p("WomanUP may use cookie files and similar technologies for:"),
        ul(
          "ensuring the operation of the website;",
          "saving user settings;",
          "authorisation;",
          "traffic analysis;",
          "improving the user experience;",
          "identifying technical errors;",
          "ensuring security.",
        ),
        p("The User may change the cookie settings in the browser. If certain cookies are disabled, some functions of the website may not work correctly."),
      ],
    },
    {
      n: "12",
      title: "Marketing communications",
      blocks: [
        p("Where the relevant consent has been given, WomanUP may send the User:"),
        ul(
          "platform news;",
          "information about educational programmes;",
          "information about vacancies;",
          "notifications of events;",
          "special offers;",
          "other informational or marketing communications.",
        ),
        p("The User may opt out of receiving marketing communications, where such an option is provided in the relevant communication or in the account settings."),
        p("Opting out of marketing communications does not necessarily mean ceasing to receive the technical and service notifications necessary for the operation of the account."),
      ],
    },
    {
      n: "13",
      title: "The User's rights",
      blocks: [
        p("In accordance with the applicable legislation, the User has rights in respect of their personal data, including the rights provided for by law to obtain information about the processing of data, to have inaccurate data rectified, and other rights."),
        p("The User may submit a request to WomanUP to:"),
        ul(
          "find out whether their personal data are being processed;",
          "obtain information about the purposes of processing;",
          "correct inaccurate or outdated data;",
          "update profile information;",
          "delete the account in cases where deletion is permitted;",
          "withdraw previously given consent in the manner prescribed by law;",
          "stop using particular functions involving the processing of data.",
        ),
        p("A request may be sent using the WomanUP contact details given in the “Contacts” section."),
        p("WomanUP is entitled to request additional information necessary to verify the identity of the applicant and to prevent unauthorised access to personal data."),
      ],
    },
    {
      n: "14",
      title: "Account deletion",
      blocks: [
        p("The User may submit a request for the deletion of their account."),
        p("Upon receipt of such a request, WomanUP takes the necessary measures in accordance with the applicable legislation and the technical capabilities of the platform."),
        p("Certain data may be retained after the account is deleted if their further retention is necessary:"),
        ul(
          "to comply with the requirements of the law;",
          "to protect the legitimate rights and interests of WomanUP;",
          "to resolve disputes;",
          "to fulfil obligations that arose previously;",
          "in other cases provided for by law.",
        ),
      ],
    },
    {
      n: "15",
      title: "Personal data of minors",
      blocks: [
        p("WomanUP does not have as its primary purpose the collection of personal data of minors without a basis provided for by law and the necessary consents."),
        p("If the use of a particular service requires that a certain age has been reached, the User is obliged to provide accurate information about their age."),
        p("If WomanUP becomes aware that personal data of a minor have been obtained in breach of applicable requirements, the platform may take measures to delete them or to restrict their processing."),
      ],
    },
    {
      n: "16",
      title: "Links to third-party websites",
      blocks: [
        p("The WomanUP platform may contain links to the websites of educational organisations, employers, partners and other third parties."),
        p("Once the User moves to a third-party website, the processing of personal data is governed by the privacy policy of that website."),
        p("WomanUP is not responsible for the content, security or personal data processing practices of third-party websites that do not belong to WomanUP."),
        p("Before transferring personal data to a third-party organisation, the User is advised to read its privacy policy."),
      ],
    },
    {
      n: "17",
      title: "Educational organisations and employers",
      blocks: [
        p("WomanUP may post offers provided by educational organisations, employers and other partners."),
        p("Information about such offers may include:"),
        ul(
          "the name of the organisation;",
          "a description of the programme or vacancy;",
          "requirements;",
          "terms of participation;",
          "contact information;",
          "other information provided by the relevant organisation.",
        ),
        p("WomanUP endeavours to provide up-to-date information but does not guarantee the absolute accuracy, completeness or continued currency of information posted by third parties."),
        p("The terms of study, employment, internship, payment and other terms are determined by the relevant organisation."),
      ],
    },
    {
      n: "18",
      title: "The User's responsibility for the data provided",
      blocks: [
        p("The User is obliged to provide accurate and up-to-date information."),
        p("The User must not:"),
        ul(
          "provide the personal data of other persons without a lawful basis;",
          "use another person's account;",
          "post information known to be false;",
          "upload documents belonging to another person without permission;",
          "use the platform for unlawful purposes.",
        ),
        p("Where the User provides information about third parties, the User must have an appropriate lawful basis for providing it."),
      ],
    },
    {
      n: "19",
      title: "Changes to the Privacy Policy",
      blocks: [
        p("WomanUP may update this Privacy Policy from time to time in connection with:"),
        ul(
          "changes to the platform's functionality;",
          "changes in legislation;",
          "the introduction of new technologies;",
          "changes to the methods of processing personal data;",
          "other circumstances.",
        ),
        p("The new version of the Policy takes effect from the moment it is published on the website, unless otherwise stated in the new version."),
        p("The date of the last update is indicated at the beginning of the document."),
      ],
    },
    {
      n: "20",
      title: "Contacts",
      blocks: [
        p("For questions regarding the processing of personal data, account deletion, changes to data or the exercise of other rights, the User may contact WomanUP:"),
        { kind: "contacts" },
      ],
    },
    {
      n: "21",
      title: "Final provisions",
      blocks: [
        p("This Privacy Policy forms part of the terms of use of the WomanUP platform."),
        p("By using WomanUP, the User confirms that they have read this Policy and understand the main principles of the processing of their personal data."),
        p("WomanUP endeavours to ensure the confidentiality and security of users' personal data and to process them only within the stated purposes and the applicable legislation."),
        p("**WomanUP helps users find educational and career opportunities but does not guarantee obtaining a job or any other specific result.**"),
      ],
    },
  ],
};
