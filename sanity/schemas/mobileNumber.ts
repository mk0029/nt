import { defineType } from "sanity";

export default defineType({
  name: "mobileNumber",
  title: "Mobile Number",
  type: "document",
  fields: [
    {
      name: "userId",
      title: "User ID",
      type: "string",
      validation: (Rule) => Rule.required(),
    },
    {
      name: "phoneNumber",
      title: "Phone Number",
      type: "string",
      validation: (Rule) => Rule.required(),
    },
    {
      name: "normalizedPhoneNumber",
      title: "Normalized Phone Number",
      type: "string",
      validation: (Rule) => Rule.required(),
    },
    {
      name: "name",
      title: "Name",
      type: "string",
    },
    {
      name: "place",
      title: "Place",
      type: "string",
    },
    {
      name: "includedIn",
      title: "Included In",
      type: "string",
    },
    {
      name: "callStatus",
      title: "Call Status",
      type: "string",
      options: {
        list: [
          { title: "Accepted", value: "accepted" },
          { title: "Not Accepted", value: "not_accepted" },
          { title: "Declined", value: "declined" },
          { title: "Unknown", value: "unknown" },
        ],
      },
      initialValue: "unknown",
      validation: (Rule) => Rule.required(),
    },
    {
      name: "lastResponse",
      title: "Last Response",
      type: "text",
    },
    {
      name: "lastContactedAt",
      title: "Last Contacted At",
      type: "datetime",
    },
    {
      name: "createdAt",
      title: "Created At",
      type: "datetime",
    },
    {
      name: "updatedAt",
      title: "Updated At",
      type: "datetime",
    },
  ],
  preview: {
    select: {
      title: "phoneNumber",
      subtitle: "name",
    },
  },
});