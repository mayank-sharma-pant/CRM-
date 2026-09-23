const test = require('node:test');
const assert = require('node:assert/strict');
const { previewLeadsLocally, toLegacyLeadCsv } = require('./leadCsv.cjs');

test('maps a sheet export and keeps quoted commas', () => {
  const text = 'Full Name,Email,Company\n"Sharma, A",a@a.com,Visiblo\n,missing@x.com,Nope\n';
  const preview = previewLeadsLocally(text);
  assert.equal(preview.error, null);
  assert.equal(preview.counts.new, 1);
  assert.equal(preview.counts.invalid, 1);
  assert.equal(preview.mapping.name, 'Full Name');
  assert.equal(preview.rows[0].values.name, 'Sharma, A');

  const csv = toLegacyLeadCsv(text, preview.mapping);
  assert.match(csv.split('\n')[0], /^name,email,phone,company,source,service_type$/);
  assert.match(csv, /"Sharma, A",a@a.com,,Visiblo/);
});

test('asks for a name column when none matches', () => {
  const preview = previewLeadsLocally('Title,Notes\nHello,World\n');
  assert.equal(preview.error, 'CSV mapping must include a name column');
  assert.equal(preview.counts.new, 0);
  assert.deepEqual(preview.headers, ['Title', 'Notes']);
});

test('parses tab-separated sheet exports', () => {
  const text = 'Full Name\tEmail\tCompany\nAda Lovelace\tada@x.com\tVisiblo\n';
  const preview = previewLeadsLocally(text);
  assert.equal(preview.error, null);
  assert.equal(preview.counts.new, 1);
  assert.equal(preview.rows[0].values.name, 'Ada Lovelace');
});

test('joins first and last name when there is no name column', () => {
  const text = 'First Name,Last Name,Email\nAda,Lovelace,ada@x.com\n';
  const preview = previewLeadsLocally(text);
  assert.equal(preview.error, null);
  assert.equal(preview.rows[0].values.name, 'Ada Lovelace');
  const csv = toLegacyLeadCsv(text, preview.mapping);
  assert.match(csv, /Ada Lovelace,ada@x.com/);
});
