-- Allow 'social' and 'social_media' contact methods in timber.external_contacts
alter table timber.external_contacts drop constraint if exists external_contacts_contact_method_check;
alter table timber.external_contacts add constraint external_contacts_contact_method_check check(contact_method in ('email','phone','social','social_media'));
