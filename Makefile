all: ordbank.db articlelist.json

clean:
	rm ordbank.db fullformsliste-utf8.txt articlelist.json

fullformsliste-utf8.txt:
	wget https://www.nb.no/sbfil/leksikalske_databaser/ordbank/20220201_norsk_ordbank_nob_2005.tar.gz -O- | tar xz fullformsliste.txt
	iconv -f latin1 -t UTF-8 fullformsliste.txt -o fullformsliste-utf8.txt

ordbank.db: fullformsliste-utf8.txt
	sqlite3 ordbank.db \
		'.separator "\t" "\n"' \
		'create table fullformsliste ( LOEPENR INTEGER PRIMARY KEY, LEMMA_ID INTEGER NOT NULL, OPPSLAG TEXT NOT NULL, TAG TEXT, PARADIGME_ID TEXT, BOY_NUMMER TEXT, FRADATO TEXT, TILDATO TEXT, NORMERING TEXT )' \
		'.import --skip 1 fullformsliste-utf8.txt fullformsliste' \
		'create index oppslag on fullformsliste (OPPSLAG)' \
		'create index lemma_id on fullformsliste (LEMMA_ID)'

articlelist.json:
	wget -O articlelist.json https://raw.githubusercontent.com/olafmoriarty/sladdactle/main/src/data/no_articleList.json
