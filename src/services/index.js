const { Op } = require("sequelize");
const {sequelize, Contact} = require("../../database/models/");

class IdentityService {
  async identifyContact(email, phoneNumber) {
    const transaction = await sequelize.transaction();

    try {
      // Find existing contacts that match email or phoneNumber
      const existingContacts = await Contact.findAll({
        where: {
          [Op.or]: [
            email ? { email } : null,
            phoneNumber ? { phoneNumber } : null,
          ].filter(Boolean),
        },
        transaction,
      });

      if (existingContacts.length === 0) {
        // No existing contacts, create a new primary contact
        const newContact = await Contact.create(
          {
            email,
            phoneNumber,
            linkPrecedence: "primary",
          },
          { transaction }
        );

        await transaction.commit();
        return this.formatResponse(newContact, []);
      }

      // Get all linked contacts for existing matches
      const allLinkedContacts = await this.getAllLinkedContacts(
        existingContacts,
        transaction
      );

      // Check if this is exactly the same contact (same email and phone)
      const exactMatch = allLinkedContacts.find(
        (contact) =>
          contact.email === email && contact.phoneNumber === phoneNumber
      );

      if (exactMatch) {
        // Exact match found, just return the consolidated contact
        await transaction.commit();
        return this.consolidateContacts(allLinkedContacts);
      }

      // Group contacts by their primary contact
      const contactGroups = this.groupContactsByPrimary(allLinkedContacts);

      // Check if we need to merge different primary contact groups
      if (contactGroups.length > 1) {
        // Multiple primary groups found, need to merge them
        const oldestPrimary = contactGroups.reduce((oldest, current) =>
          current.primary.createdAt < oldest.primary.createdAt
            ? current
            : oldest
        ).primary;

        // Update other primary contacts to secondary and link to oldest primary
        for (const group of contactGroups) {
          if (group.primary.id !== oldestPrimary.id) {
            await Contact.update(
              {
                linkedId: oldestPrimary.id,
                linkPrecedence: "secondary",
              },
              {
                where: { id: group.primary.id },
                transaction,
              }
            );
          }
        }

        // Update all secondary contacts to point to the oldest primary
        const secondaryIds = contactGroups.flatMap((group) =>
          group.secondaries.map((s) => s.id)
        );

        if (secondaryIds.length > 0) {
          await Contact.update(
            { linkedId: oldestPrimary.id },
            {
              where: { id: { [Op.in]: secondaryIds } },
              transaction,
            }
          );
        }

        // Create new secondary contact to bridge the groups
        const newContact = await Contact.create(
          {
            email,
            phoneNumber,
            linkedId: oldestPrimary.id,
            linkPrecedence: "secondary",
          },
          { transaction }
        );

        // Get all contacts now linked to the oldest primary
        const allMergedContacts = await Contact.findAll({
          where: {
            [Op.or]: [{ id: oldestPrimary.id }, { linkedId: oldestPrimary.id }],
          },
          transaction,
        });

        await transaction.commit();
        return this.consolidateContacts(allMergedContacts);
      }

      // Single primary group - check if we need to create a new secondary contact
      const primaryGroup = contactGroups[0];
      const hasNewInfo = this.hasNewInformation(
        primaryGroup,
        email,
        phoneNumber
      );

      if (hasNewInfo) {
        // Create a new secondary contact with the new information
        const newContact = await Contact.create(
          {
            email,
            phoneNumber,
            linkedId: primaryGroup.primary.id,
            linkPrecedence: "secondary",
          },
          { transaction }
        );

        // Get updated list of all linked contacts
        const updatedContacts = await this.getAllLinkedContacts(
          [primaryGroup.primary],
          transaction
        );

        await transaction.commit();
        return this.consolidateContacts(updatedContacts);
      } else {
        // No new information, just return existing consolidated contact
        await transaction.commit();
        return this.consolidateContacts(allLinkedContacts);
      }
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  groupContactsByPrimary(contacts) {
    const groups = new Map();

    for (const contact of contacts) {
      if (contact.linkPrecedence === "primary") {
        if (!groups.has(contact.id)) {
          groups.set(contact.id, {
            primary: contact,
            secondaries: [],
          });
        }
      } else {
        // Secondary contact
        const primaryId = contact.linkedId;
        if (!groups.has(primaryId)) {
          // Find the primary contact
          const primary = contacts.find((c) => c.id === primaryId);
          if (primary) {
            groups.set(primaryId, {
              primary: primary,
              secondaries: [contact],
            });
          }
        } else {
          groups.get(primaryId).secondaries.push(contact);
        }
      }
    }

    return Array.from(groups.values());
  }

  hasNewInformation(group, email, phoneNumber) {
    const allContacts = [group.primary, ...group.secondaries];

    // Check if the exact combination already exists
    const exactMatch = allContacts.find(
      (contact) =>
        contact.email === email && contact.phoneNumber === phoneNumber
    );

    return !exactMatch;
  }

  async getAllLinkedContacts(contacts, transaction) {
    const contactIds = new Set();
    const toProcess = [...contacts];
    const processed = new Set();
    const allContacts = [];

    while (toProcess.length > 0) {
      const current = toProcess.pop();

      if (processed.has(current.id)) continue;
      processed.add(current.id);
      contactIds.add(current.id);
      allContacts.push(current);

      // Find all contacts linked to this one
      const linkedContacts = await Contact.findAll({
        where: {
          [Op.or]: [{ linkedId: current.id }, { id: current.linkedId }],
        },
        transaction,
      });

      for (const linked of linkedContacts) {
        if (!processed.has(linked.id)) {
          toProcess.push(linked);
        }
      }
    }

    return allContacts;
  }

  consolidateContacts(contacts) {
    const primary =
      contacts.find((contact) => contact.linkPrecedence === "primary") ||
      contacts.reduce((oldest, current) =>
        current.createdAt < oldest.createdAt ? current : oldest
      );

    const secondaryContacts = contacts.filter(
      (contact) => contact.id !== primary.id
    );

    const emails = [
      ...new Set(
        [primary.email, ...secondaryContacts.map((c) => c.email)].filter(
          Boolean
        )
      ),
    ];

    const phoneNumbers = [
      ...new Set(
        [
          primary.phoneNumber,
          ...secondaryContacts.map((c) => c.phoneNumber),
        ].filter(Boolean)
      ),
    ];

    return this.formatResponse(
      primary,
      secondaryContacts,
      emails,
      phoneNumbers
    );
  }

  formatResponse(primary, secondaryContacts, emails = [], phoneNumbers = []) {
    // If emails and phoneNumbers are not provided, extract from contacts
    if (emails.length === 0 && phoneNumbers.length === 0) {
      emails = primary.email ? [primary.email] : [];
      phoneNumbers = primary.phoneNumber ? [primary.phoneNumber] : [];
    }

    return {
      contact: {
        primaryContatctId: primary.id,
        emails,
        phoneNumbers,
        secondaryContactIds: secondaryContacts.map((contact) => contact.id),
      },
    };
  }
}

module.exports = new IdentityService();
