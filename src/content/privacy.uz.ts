import type { Block, PolicyDoc } from "./privacy";

const p = (text: string): Block => ({ kind: "p", text });
const ul = (...items: string[]): Block => ({ kind: "ul", items });
const ol = (...items: string[]): Block => ({ kind: "ol", items });

export const UZ: PolicyDoc = {
  lead: [
    p("Mazkur Maxfiylik siyosati WomanUP platformasi foydalanuvçilarining şaxsga doir maʼlumotlarini yiğiş, ulardan foydalaniş, ularni saqlaş, qayta işlaş va himoya qiliş tartibini tartibga soladi."),
    p("WomanUP — kasbiy va şaxsiy rivojlaniş uçun taʼlim dasturlari, kurslar, tadbirlar, stajirovkalar, vakansiyalar va boşqa imkoniyatlarni qidiriş hamda tanlaşga möljallangan raqamli platforma va marketpleys."),
    p("WomanUP saytidan foydalanib, platformada röyxatdan ötib, şakllarni töldirib yoki öz şaxsga doir maʼlumotlarini taqdim etib, foydalanuvçi mazkur Maxfiylik siyosati bilan tanişib çiqqanligini tasdiqlaydi va uning şartlarini qonunçilikda nazarda tutilgan tartibda qabul qiladi."),
  ],
  sections: [
    {
      n: "1",
      title: "Umumiy qoidalar",
      blocks: [
        p("1.1. Mazkur Siyosat WomanUP sayti va raqamli servislarining barça foydalanuvçilariga nisbatan qöllaniladi."),
        p("1.2. Siyosat WomanUP foydalanuvçidan quyidagi hollarda oladigan maʼlumotlarga nisbatan tatbiq etiladi:"),
        ul(
          "platformada röyxatdan ötişda;",
          "profil yaratişda;",
          "anketalarni töldirişda;",
          "taʼlim dasturlariga ariza berişda;",
          "vakansiyalar va stajirovkalarni qidirişda;",
          "rezyume yaratiş yoki yuklaşda;",
          "tadbirlarda iştirok etişda;",
          "qöllab-quvvatlaş xizmatiga murojaat qilişda;",
          "saytdan va uning funksional imkoniyatlaridan foydalanişda.",
        ),
        p("1.3. WomanUP şaxsga doir maʼlumotlarni Özbekiston Respublikasining qöllaniladigan qonunçiligiga, şu jumladan şaxsga doir maʼlumotlar töğrisidagi qonunçilikka muvofiq qayta işlaydi."),
        p("1.4. Şaxsga doir maʼlumotlarni qayta işlaşning asosiy tamoyillari qonuniylik, maqsadga muvofiqlik, haqqoniylik, maxfiylik va şaxsga doir maʼlumotlarning xavfsizligini taʼminlaşdan iborat."),
      ],
    },
    {
      n: "2",
      title: "Biz qanday şaxsga doir maʼlumotlarni yiğişimiz mumkin",
      blocks: [
        p("Foydalaniladigan funksiyalarga qarab WomanUP maʼlumotlarning quyidagi toifalarini qayta işlaşi mumkin:"),
      ],
      groups: [
        {
          title: "2.1. Akkaunt maʼlumotlari",
          blocks: [
            ul(
              "ism va familiya;",
              "elektron poçta manzili;",
              "telefon raqami;",
              "himoyalangan şakldagi parol;",
              "profil surati;",
              "yaşaş şahri yoki hududi töğrisidagi maʼlumot.",
            ),
          ],
        },
        {
          title: "2.2. Taʼlimga oid maʼlumotlar",
          blocks: [
            p("Foydalanuvçi mustaqil ravişda quyidagilarni taqdim etişi mumkin:"),
            ul(
              "taʼlim darajasi;",
              "taʼlim muassasasi;",
              "mutaxassislik;",
              "kasbiy könikmalar;",
              "ötilgan kurslar;",
              "sertifikatlar;",
              "taʼlim dasturlarida iştirok etiş tajribasi;",
              "qiziqtiradigan taʼlim yönalişlari.",
            ),
          ],
        },
        {
          title: "2.3. Karyeraga oid maʼlumotlar",
          blocks: [
            p("Karyera funksiyalaridan foydalanişda foydalanuvçi quyidagilarni taqdim etişi mumkin:"),
            ul(
              "avvalgi iş tajribasi töğrisidagi maʼlumotlar;",
              "lavozim;",
              "kasbiy könikmalar;",
              "portfolio;",
              "rezyume;",
              "istalgan lavozim;",
              "afzal köriladigan iş formati;",
              "kasbiy yutuqlar töğrisidagi maʼlumotlar;",
              "foydalanuvçi profil yoki rezyumeda mustaqil ravişda körsatadigan boşqa maʼlumotlar.",
            ),
          ],
        },
        {
          title: "2.4. Texnik maʼlumotlar",
          blocks: [
            p("Saytdan foydalanişda avtomatik ravişda texnik maʼlumotlar, şu jumladan quyidagilar yiğilişi mumkin:"),
            ul(
              "IP-manzil;",
              "qurilma turi;",
              "operatsion tizim;",
              "brauzer turi;",
              "interfeys tili;",
              "taşrif sanasi va vaqti;",
              "foydalanuvçi taşrif buyurgan sayt sahifalari va bölimlari;",
              "sayt bilan özaro taʼsir töğrisidagi texnik maʼlumotlar.",
            ),
          ],
        },
      ],
    },
    {
      n: "3",
      title: "Şaxsga doir maʼlumotlarni qayta işlaş maqsadlari",
      blocks: [
        p("WomanUP foydalanuvçining şaxsga doir maʼlumotlaridan quyidagi maqsadlarda foydalanişi mumkin:"),
        ol(
          "Foydalanuvçi akkauntini yaratiş va unga xizmat körsatiş.",
          "Platforma funksiyalaridan foydalaniş imkonini taqdim etiş.",
          "Foydalanuvçining qiziqişlariga muvofiq taʼlim dasturlari va boşqa imkoniyatlarni tanlab beriş.",
          "Taʼlim dasturlari, tadbirlar, stajirovkalar va boşqa takliflarda iştirok etiş uçun arizalarni qayta işlaş.",
          "Foydalanuvçiga vakansiyalar va karyera imkoniyatlarini qidirişda yordam beriş.",
          "Foydalanuvçi sozlamalariga muvofiq foydalanuvçi profili va rezyumesini şakllantiriş hamda aks ettiriş.",
          "Foydalanuvçining tegişli imkoniyatda iştirok etişi uçun zarur bölgan hamda qonunçilik va foydalanuvçining roziligi bilan yöl qöyiladigan hollarda zarur maʼlumotlarni taʼlim taşkilotlariga, dastur taşkilotçilariga yoki potensial iş beruvçilarga uzatiş.",
          "Platformaning işlaşi, arizalar, taʼlim dasturlari va karyera imkoniyatlari masalalari yuzasidan foydalanuvçi bilan boğlaniş.",
          "Texnik yordam körsatiş.",
          "WomanUP sifati va funksionalligini yaxşilaş.",
          "Platformadan foydalanişni tahlil qiliş va texnik muammolarni aniqlaş.",
          "Firibgarlik, suiisteʼmolliklar va platforma qoidalari buzilişining oldini oliş.",
          "Özbekiston Respublikasi qonunçiligi talablarini bajariş.",
        ),
      ],
    },
    {
      n: "4",
      title: "Imkoniyatlarni tanlab beriş uçun maʼlumotlardan foydalaniş",
      blocks: [
        p("WomanUP foydalanuvçi taqdim etgan maʼlumotlardan uning qiziqişlari, taʼlimi, könikmalari va kasbiy maqsadlariga mos kelişi mumkin bölgan taʼlim dasturlari, vakansiyalar, stajirovkalar va boşqa imkoniyatlarni taklif etiş uçun foydalanişi mumkin."),
        p("Bunday tavsiyalar avtomatik ravişda yoki platformaning içki vositalaridan foydalangan holda şakllantirilişi mumkin."),
        p("WomanUP tavsiyalari muayyan dastur, vakansiya yoki boşqa imkoniyat foydalanuvçiga mos kelişi yoki maʼlum natijaga olib kelişining kafolati hisoblanmaydi."),
      ],
    },
    {
      n: "5",
      title: "Iş qidiriş va işga joylaşiş kafolatining yöqligi",
      blocks: [
        p("WomanUP foydalanuvçilarga vakansiyalar, stajirovkalar va boşqa karyera imkoniyatlarini qidiriş uçun vositalarni taqdim etadi."),
        p("Platforma foydalanuvçiga quyidagilarda yordam berişi mumkin:"),
        ul(
          "mos vakansiyalarni topiş;",
          "iş beruvçilarni topiş;",
          "rezyume şakllantiriş yoki joylaştiriş;",
          "arizalar yuboriş;",
          "karyera imkoniyatlari töğrisida maʼlumot oliş;",
          "iş beruvçilar yoki taşkilotlar bilan özaro aloqada böliş.",
        ),
        p("**Bunda WomanUP foydalanuvçining işga joylaşişini kafolatlamaydi.**"),
        p("Platformadan foydalaniş quyidagilarning kafolatlanganligini anglatmaydi:"),
        ul(
          "iş topiş;",
          "suhbatdan ötiş;",
          "işga qabul qiliniş;",
          "mehnat şartnomasi tuziliş;",
          "muayyan lavozimga ega böliş;",
          "muayyan miqdordagi iş haqini oliş;",
          "stajirovkadan ötiş;",
          "iş taklifini (offer) oliş.",
        ),
        p("Işga qabul qiliş, suhbatga taklif etiş, stajirovkada iştirok etiş yoki boşqa imkoniyatni taqdim etiş töğrisidagi qarorni tegişli iş beruvçi, taʼlim taşkiloti yoki boşqa hamkor mustaqil ravişda qabul qiladi."),
        p("Agar muayyan taklifda boşqaça oçiq körsatilmagan bölsa, WomanUP foydalanuvçining iş beruvçisi hisoblanmaydi."),
      ],
    },
    {
      n: "6",
      title: "Şaxsga doir maʼlumotlarni uçinçi şaxslarga uzatiş",
      blocks: [
        p("WomanUP foydalanuvçilarning şaxsga doir maʼlumotlarini uçinçi şaxslarga sotmaydi."),
        p("Şaxsga doir maʼlumotlar uçinçi şaxslarga faqat platformaning tegişli funksiyasi işlaşi, foydalanuvçining sörovini bajariş, şartnomani ijro etiş, qonunçilik talablarini bajariş uçun zarur bölgan hollarda yoki boşqa qonuniy asos mavjud bölganda taqdim etilişi mumkin."),
        p("Xususan, foydalanuvçi tanlagan funksiyaga qarab maʼlumotlar quyidagilarga uzatilişi mumkin:"),
        ul(
          "taʼlim taşkilotlariga;",
          "taʼlim dasturlari taşkilotçilariga;",
          "iş beruvçilarga;",
          "stajirovka taqdim etuvçi taşkilotlarga;",
          "platformaning işlaşini taʼminlovçi texnik va IT-yetkazib beruvçilarga;",
          "platformada tölov funksiyalaridan foydalanilgan taqdirda tölov servislariga;",
          "qonunçilikda nazarda tutilgan hollarda davlat organlariga.",
        ),
        p("Nomzodni körib çiqiş uçun maʼlumotlarni iş beruvçiga yoki taʼlim taşkilotiga uzatiş faqat tegişli maqsad uçun zarur bölgan hajmda amalga oşirilişi mumkin."),
      ],
    },
    {
      n: "7",
      title: "Foydalanuvçining ommaviy profili",
      blocks: [
        p("Agar WomanUP ommaviy profil yaratiş imkoniyatini taqdim etsa, foydalanuvçi qaysi maʼlumotlar platformaning boşqa foydalanuvçilari yoki uçinçi şaxslar uçun oçiq bölişi mumkinligini mustaqil ravişda belgilaydi."),
        p("Foydalanuvçi ommaviy profil, portfolio, rezyume yoki platformaning boşqa oçiq bölimlariga mustaqil ravişda joylaştirgan maʼlumotlar uçun javobgar böladi."),
        p("Quyidagilarni ommaga oçiq holda joylaştirmaslik lozim:"),
        ul(
          "parollar;",
          "bank maʼlumotlari;",
          "pasport maʼlumotlari;",
          "bank kartalari maʼlumotlari;",
          "ommaga oçiq joylaştiriş uçun möljallanmagan boşqa maxfiy maʼlumotlar.",
        ),
      ],
    },
    {
      n: "8",
      title: "Foydalanuvçining roziligi",
      blocks: [
        p("Qonunçilikda nazarda tutilgan hollarda WomanUP foydalanuvçidan uning şaxsga doir maʼlumotlarini qayta işlaşga rozilik oladi."),
        p("Foydalanuvçi muayyan maʼlumotlarni taqdim etmaslik huquqiga ega, biroq zarur maʼlumotlarning mavjud emasligi platformaning ayrim funksiyalaridan foydalaniş imkonsiz bölişiga olib kelişi mumkin."),
        p("Masalan, aloqa maʼlumotlarisiz quyidagilar imkonsiz bölişi mumkin:"),
        ul(
          "akkaunt yaratiş;",
          "foydalanuvçi bilan boğlaniş;",
          "arizani qayta işlaş;",
          "taʼlim dasturi töğrisida maʼlumot yuboriş;",
          "arizani iş beruvçiga uzatiş.",
        ),
      ],
    },
    {
      n: "9",
      title: "Şaxsga doir maʼlumotlarni saqlaş",
      blocks: [
        p("WomanUP şaxsga doir maʼlumotlarni quyidagilardan himoya qiliş uçun zarur taşkiliy va texnik çoralarni köradi:"),
        ul(
          "noqonuniy kiriş;",
          "özgartiriş;",
          "yöq qiliş;",
          "yöqotiş;",
          "tarqatiş;",
          "nusxa köçiriş;",
          "boşqa noqonuniy harakatlar.",
        ),
        p("Şaxsga doir maʼlumotlar, agar qonunçilikda yoki boşqa qonuniy asosda uzoqroq saqlaş muddati talab etilmasa, ularni qayta işlaş maqsadlariga erişiş uçun zarur bölgan muddatdan ortiq saqlanmaydi."),
      ],
    },
    {
      n: "10",
      title: "Akkaunt xavfsizligi",
      blocks: [
        p("Foydalanuvçi öz akkauntiga kiriş maʼlumotlarining maxfiyligini mustaqil ravişda taʼminlaşi şart."),
        p("Foydalanuvçi parol yoki akkauntga kiriş uçun boşqa maʼlumotlarni uçinçi şaxslarga bermasligi lozim."),
        p("Agar foydalanuvçi akkauntda şubhali faollikni, kiriş imkoniyatining yöqotilganini yoki akkauntga ruxsatsiz kirilgan deb taxmin qilinayotgan holatni aniqlasa, u bu haqda WomanUPga zudlik bilan xabar berişi lozim."),
      ],
    },
    {
      n: "11",
      title: "Cookie fayllari va öxşaş texnologiyalar",
      blocks: [
        p("WomanUP cookie fayllari va öxşaş texnologiyalardan quyidagi maqsadlarda foydalanişi mumkin:"),
        ul(
          "saytning işlaşini taʼminlaş;",
          "foydalanuvçi sozlamalarini saqlaş;",
          "avtorizatsiya;",
          "taşriflarni tahlil qiliş;",
          "foydalanuvçi tajribasini yaxşilaş;",
          "texnik xatolarni aniqlaş;",
          "xavfsizlikni taʼminlaş.",
        ),
        p("Foydalanuvçi brauzerda cookie sozlamalarini özgartirişi mumkin. Baʼzi cookie fayllari öçirib qöyilganda saytning ayrim funksiyalari notöğri işlaşi mumkin."),
      ],
    },
    {
      n: "12",
      title: "Marketing xabarlari",
      blocks: [
        p("Tegişli rozilik mavjud bölganda WomanUP foydalanuvçiga quyidagilarni yuborişi mumkin:"),
        ul(
          "platforma yangiliklari;",
          "taʼlim dasturlari töğrisidagi maʼlumotlar;",
          "vakansiyalar töğrisidagi maʼlumotlar;",
          "tadbirlar töğrisidagi bildirişnomalar;",
          "maxsus takliflar;",
          "boşqa axborot yoki marketing xabarlari.",
        ),
        p("Agar tegişli xabarda yoki akkaunt sozlamalarida bunday imkoniyat nazarda tutilgan bölsa, foydalanuvçi marketing xabarlarini olişdan voz keçişi mumkin."),
        p("Marketing xabarlaridan voz keçiş akkauntning işlaşi uçun zarur bölgan texnik va servis bildirişnomalarini oliş töxtatilişini albatta anglatmaydi."),
      ],
    },
    {
      n: "13",
      title: "Foydalanuvçining huquqlari",
      blocks: [
        p("Qöllaniladigan qonunçilikka muvofiq foydalanuvçi öz şaxsga doir maʼlumotlariga nisbatan huquqlarga, şu jumladan qonunda nazarda tutilgan maʼlumotlarni qayta işlaş töğrisida axborot oliş, notöğri maʼlumotlarga aniqlik kiritiş huquqlariga va boşqa huquqlarga ega."),
        p("Foydalanuvçi WomanUPga quyidagi sörov bilan murojaat qilişi mumkin:"),
        ul(
          "uning şaxsga doir maʼlumotlari qayta işlanayotgan yoki işlanmayotganligini biliş;",
          "qayta işlaş maqsadlari töğrisida axborot oliş;",
          "notöğri yoki eskirgan maʼlumotlarni tuzatiş;",
          "profil maʼlumotlarini yangilaş;",
          "öçirişga yöl qöyiladigan hollarda akkauntni öçiriş;",
          "ilgari berilgan rozilikni qonunda nazarda tutilgan tartibda qaytarib oliş;",
          "maʼlumotlarni qayta işlaş bilan boğliq ayrim funksiyalardan foydalanişni töxtatiş.",
        ),
        p("Sörov «Kontaktlar» bölimida körsatilgan WomanUP aloqa maʼlumotlari orqali yuborilişi mumkin."),
        p("WomanUP arizaçining şaxsini tasdiqlaş va şaxsga doir maʼlumotlarga ğayriqonuniy kirişning oldini oliş uçun zarur bölgan qöşimça maʼlumotlarni söraşga haqli."),
      ],
    },
    {
      n: "14",
      title: "Akkauntni öçiriş",
      blocks: [
        p("Foydalanuvçi öz akkauntini öçiriş töğrisidagi sörov bilan murojaat qilişi mumkin."),
        p("Tegişli sörov olinganidan söng WomanUP qöllaniladigan qonunçilik va platformaning texnik imkoniyatlariga muvofiq zarur çoralarni köradi."),
        p("Agar ayrim maʼlumotlarni bundan keyin ham saqlaş quyidagilar uçun zarur bölsa, ular akkaunt öçirilganidan söng ham saqlanişi mumkin:"),
        ul(
          "qonunçilik talablarini bajariş uçun;",
          "WomanUPning qonuniy huquqlari va manfaatlarini himoya qiliş uçun;",
          "nizolarni hal qiliş uçun;",
          "ilgari yuzaga kelgan majburiyatlarni bajariş uçun;",
          "qonunçilikda nazarda tutilgan boşqa hollarda.",
        ),
      ],
    },
    {
      n: "15",
      title: "Voyaga yetmaganlarning şaxsga doir maʼlumotlari",
      blocks: [
        p("WomanUP qonunda nazarda tutilgan asos va zarur roziliklarsiz voyaga yetmaganlarning şaxsga doir maʼlumotlarini yiğişni öz asosiy maqsadi qilib qöymaydi."),
        p("Agar muayyan xizmatdan foydalaniş uçun maʼlum yoşga yetgan böliş talab etilsa, foydalanuvçi öz yoşi töğrisida haqqoniy maʼlumot taqdim etişi şart."),
        p("Agar WomanUPga voyaga yetmagan şaxsning şaxsga doir maʼlumotlari qöllaniladigan talablarni buzgan holda olinganligi maʼlum bölib qolsa, platforma ularni öçiriş yoki ularni qayta işlaşni çeklaş böyiça çoralar körişi mumkin."),
      ],
    },
    {
      n: "16",
      title: "Uçinçi tomon saytlariga havolalar",
      blocks: [
        p("WomanUP platformasida taʼlim taşkilotlari, iş beruvçilar, hamkorlar va boşqa uçinçi şaxslarning saytlariga havolalar joylaştirilişi mumkin."),
        p("Foydalanuvçi uçinçi tomon saytiga ötganidan söng şaxsga doir maʼlumotlarni qayta işlaş tegişli saytning maxfiylik siyosati bilan tartibga solinadi."),
        p("WomanUP öziga tegişli bölmagan uçinçi tomon saytlarining mazmuni, xavfsizligi yoki şaxsga doir maʼlumotlarni qayta işlaş amaliyoti uçun javobgar emas."),
        p("Şaxsga doir maʼlumotlarni uçinçi tomon taşkilotiga uzatişdan oldin foydalanuvçiga uning maxfiylik siyosati bilan tanişib çiqiş tavsiya etiladi."),
      ],
    },
    {
      n: "17",
      title: "Taʼlim taşkilotlari va iş beruvçilar",
      blocks: [
        p("WomanUP taʼlim taşkilotlari, iş beruvçilar va boşqa hamkorlar tomonidan taqdim etilgan takliflarni joylaştirişi mumkin."),
        p("Bunday takliflar töğrisidagi maʼlumotlar quyidagilarni öz içiga olişi mumkin:"),
        ul(
          "taşkilot nomi;",
          "dastur yoki vakansiya tavsifi;",
          "talablar;",
          "iştirok şartlari;",
          "aloqa maʼlumotlari;",
          "tegişli taşkilot tomonidan taqdim etilgan boşqa maʼlumotlar.",
        ),
        p("WomanUP dolzarb maʼlumotlarni taqdim etişga intiladi, biroq uçinçi şaxslar tomonidan joylaştirilgan maʼlumotlarning mutlaq aniqligi, töliqligi yoki doimiy dolzarbligini kafolatlamaydi."),
        p("Öqiş, işga joylaşiş, stajirovka, tölov şartlari va boşqa şartlar tegişli taşkilot tomonidan belgilanadi."),
      ],
    },
    {
      n: "18",
      title: "Foydalanuvçining taqdim etilgan maʼlumotlar uçun javobgarligi",
      blocks: [
        p("Foydalanuvçi haqqoniy va dolzarb maʼlumotlarni taqdim etişi şart."),
        p("Foydalanuvçi quyidagilarni qilmasligi lozim:"),
        ul(
          "qonuniy asoslarsiz boşqa şaxslarning şaxsga doir maʼlumotlarini taqdim etiş;",
          "boşqa şaxsning akkauntidan foydalaniş;",
          "bila turib yolğon maʼlumotlarni joylaştiriş;",
          "boşqa şaxsga tegişli hujjatlarni ruxsatsiz yuklaş;",
          "platformadan noqonuniy maqsadlarda foydalaniş.",
        ),
        p("Foydalanuvçi uçinçi şaxslarning maʼlumotlarini taqdim etgan taqdirda, u ularni taqdim etiş uçun tegişli qonuniy asosga ega bölişi lozim."),
      ],
    },
    {
      n: "19",
      title: "Maxfiylik siyosatini özgartiriş",
      blocks: [
        p("WomanUP mazkur Maxfiylik siyosatini quyidagilar munosabati bilan vaqti-vaqti bilan yangilab turişi mumkin:"),
        ul(
          "platforma funksionalligining özgarişi;",
          "qonunçilikning özgarişi;",
          "yangi texnologiyalarning joriy etilişi;",
          "şaxsga doir maʼlumotlarni qayta işlaş usullarining özgarişi;",
          "boşqa holatlar.",
        ),
        p("Agar yangi tahrirda boşqaça körsatilmagan bölsa, Siyosatning yangi tahriri saytda eʼlon qilingan paytdan boşlab kuçga kiradi."),
        p("Oxirgi yangilangan sana hujjatning boşida körsatiladi."),
      ],
    },
    {
      n: "20",
      title: "Kontaktlar",
      blocks: [
        p("Şaxsga doir maʼlumotlarni qayta işlaş, akkauntni öçiriş, maʼlumotlarni özgartiriş yoki boşqa huquqlarni amalga oşiriş masalalari böyiça foydalanuvçi WomanUPga murojaat qilişi mumkin:"),
        { kind: "contacts" },
      ],
    },
    {
      n: "21",
      title: "Yakuniy qoidalar",
      blocks: [
        p("Mazkur Maxfiylik siyosati WomanUP platformasidan foydalaniş şartlarining bir qismi hisoblanadi."),
        p("WomanUPdan foydalanib, foydalanuvçi mazkur Siyosat bilan tanişib çiqqanligini va uning şaxsga doir maʼlumotlarini qayta işlaşning asosiy tamoyillarini tuşunişini tasdiqlaydi."),
        p("WomanUP foydalanuvçilar şaxsga doir maʼlumotlarining maxfiyligi va xavfsizligini taʼminlaşga hamda ularni faqat eʼlon qilingan maqsadlar va qöllaniladigan qonunçilik doirasida qayta işlaşga intiladi."),
        p("**WomanUP foydalanuvçilarga taʼlim va karyera imkoniyatlarini topişda yordam beradi, biroq iş topiş yoki boşqa muayyan natijaga erişişni kafolatlamaydi.**"),
      ],
    },
  ],
};
